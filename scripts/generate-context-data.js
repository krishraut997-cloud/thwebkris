import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "@huggingface/transformers";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORD_LIST_URL =
  "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt";
const MODEL_ID = "Xenova/all-MiniLM-L6-v2";
const WORD_COUNT = 1500;
const DIMENSION = 384;
const BATCH_SIZE = 32;
const seedWords = `
  ocean sea water wave beach tide coast fish island river lake boat sail shore
  marine blue whale current sand coral deep salt surf harbor ship swim seashell
  bay reef sailing seagull garden plant flower tree seed soil grass leaf bloom
  rose green grow root vegetable yard park tulip sunflower watering pot herb
  botany dirt lawn orchard bee shovel spring nature petal planting music song
  sound melody singer band guitar piano rhythm concert note instrument dance
  album radio voice drum jazz rock listen tune orchestra lyrics record
  microphone keyboard bass beat choir stage harmony coffee tea drink cafe cup
  espresso bean caffeine brew morning latte mug milk roast barista hot breakfast
  sugar chocolate cream cappuccino kettle aroma bitter mocha cocoa restaurant
  break sip filter space universe planet star moon galaxy astronaut rocket earth
  mars sky orbit solar telescope cosmos satellite light comet gravity science
  spaceship meteor jupiter alien vacuum launch astronomy night sun nebula
  exploration
`.trim().split(/\s+/);

const stopWords = new Set(`
  a about above after again against all am an and any are as at be because been
  before being below between both but by can could did do does doing down during
  each few for from further had has have having he her here hers herself him
  himself his how i if in into is it its itself just me more most my myself no
  nor not of off on once only or other our ours ourselves out over own same she
  should so some such than that the their theirs them themselves then there
  these they this those through to too under until up very was we were what when
  where which while who whom why will with would you your yours yourself
  yourselves don didn doesn isn aren wasn weren won wouldn couldn shouldn haven
  hasn hadn mightn mustn needn shan oughtn gonna wanna gotta lemme kinda sorta
  yeah yep yup nah nope okay ok hey hello hi bye goodbye man guys sir dude bro
  please thanks thank sorry welcome sure maybe really thing things anything
  something nothing everything everybody somebody anybody nobody everyone
  someone anyone whatever whenever wherever anyhow said tell told say
`.trim().split(/\s+/));

async function getVocabulary() {
  const response = await fetch(WORD_LIST_URL);
  if (!response.ok) {
    throw new Error(`Could not download the licensed word list (${response.status}).`);
  }

  const text = await response.text();
  const sourceWords = new Set(
    text.split(/\r?\n/).map((line) => line.trim().split(/\s+/)[0]?.toLowerCase()).filter(Boolean),
  );
  const words = [...new Set(seedWords)];
  const missingSeeds = words.filter((word) => !sourceWords.has(word));

  if (missingSeeds.length > 0) {
    throw new Error(`The frequency list is missing required game words: ${missingSeeds.join(", ")}.`);
  }

  const seen = new Set(words);

  for (const line of text.split(/\r?\n/)) {
    const word = line.trim().split(/\s+/)[0]?.toLowerCase();
    if (!word || !/^[a-z]{3,}$/.test(word) || stopWords.has(word) || seen.has(word)) continue;
    seen.add(word);
    words.push(word);
    if (words.length === WORD_COUNT) break;
  }

  if (words.length !== WORD_COUNT) {
    throw new Error(`Expected ${WORD_COUNT} unique words, found ${words.length}.`);
  }

  return words;
}

async function main() {
  const words = await getVocabulary();
  console.log(`Generating ${words.length} embeddings with ${MODEL_ID}...`);

  const embed = await pipeline("feature-extraction", MODEL_ID);
  const vectors = Buffer.alloc(words.length * DIMENSION);

  for (let start = 0; start < words.length; start += BATCH_SIZE) {
    const batch = words.slice(start, start + BATCH_SIZE);
    const output = await embed(batch, { pooling: "mean", normalize: true });

    if (output.dims[0] !== batch.length || output.dims[1] !== DIMENSION) {
      throw new Error(`Unexpected embedding dimensions: ${output.dims.join(" × ")}.`);
    }

    for (let wordIndex = 0; wordIndex < batch.length; wordIndex += 1) {
      for (let dimension = 0; dimension < DIMENSION; dimension += 1) {
        const value = Math.max(-127, Math.min(127, Math.round(
          output.data[wordIndex * DIMENSION + dimension] * 127,
        )));
        vectors.writeInt8(value, (start + wordIndex) * DIMENSION + dimension);
      }
    }

    console.log(`Embedded ${Math.min(start + batch.length, words.length)}/${words.length}`);
  }

  const publicDir = path.join(ROOT, "public");
  await mkdir(publicDir, { recursive: true });
  await Promise.all([
    writeFile(
      path.join(publicDir, "context-vocabulary.json"),
      `${JSON.stringify({
        schemaVersion: 1,
        model: MODEL_ID,
        dimension: DIMENSION,
        words,
      })}\n`,
    ),
    writeFile(path.join(publicDir, "context-vectors.bin"), vectors),
  ]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
