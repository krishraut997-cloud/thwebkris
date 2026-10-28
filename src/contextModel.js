export const CONTEXT_VOCABULARY_SIZE = 10000;
export const CONTEXT_UNLISTED_RANK = CONTEXT_VOCABULARY_SIZE + 1;

const MODEL_FILES = {
  vocabulary: `${import.meta.env.BASE_URL}context-vocabulary.json`,
  vectors: `${import.meta.env.BASE_URL}context-vectors.bin`,
};

let modelPromise;

async function loadModel() {
  const [vocabularyResponse, vectorsResponse] = await Promise.all([
    fetch(MODEL_FILES.vocabulary),
    fetch(MODEL_FILES.vectors),
  ]);

  if (!vocabularyResponse.ok || !vectorsResponse.ok) {
    throw new Error("The semantic word data could not be loaded. Refresh the page to try again.");
  }

  const vocabulary = await vocabularyResponse.json();
  const vectors = new Int8Array(await vectorsResponse.arrayBuffer());

  if (
    vocabulary.schemaVersion !== 1 ||
    vocabulary.dimension !== 384 ||
    !Array.isArray(vocabulary.words) ||
    vocabulary.words.length !== CONTEXT_VOCABULARY_SIZE ||
    vocabulary.words.some((word) => typeof word !== "string") ||
    vectors.length !== vocabulary.words.length * vocabulary.dimension
  ) {
    throw new Error("The semantic word data is incomplete or invalid.");
  }

  return {
    words: vocabulary.words,
    vectors,
    dimension: vocabulary.dimension,
    wordIndices: new Map(vocabulary.words.map((word, index) => [word, index])),
  };
}

export function getContextModel() {
  if (!modelPromise) {
    modelPromise = loadModel().catch((error) => {
      modelPromise = undefined;
      throw error;
    });
  }
  return modelPromise;
}

export async function getContextPuzzle(previousAnswer) {
  const model = await getContextModel();
  const options = model.words.filter((word) => word !== previousAnswer);
  const answer = options[Math.floor(Math.random() * options.length)];
  const answerIndex = model.wordIndices.get(answer);
  const answerOffset = answerIndex * model.dimension;

  const rankedWords = model.words
    .map((word, index) => {
      if (index === answerIndex) {
        return { word, similarity: Number.POSITIVE_INFINITY };
      }

      let similarity = 0;
      const offset = index * model.dimension;

      for (let dimension = 0; dimension < model.dimension; dimension += 1) {
        similarity += model.vectors[answerOffset + dimension] * model.vectors[offset + dimension];
      }

      return { word, similarity };
    })
    .sort((first, second) =>
      second.similarity - first.similarity ||
      first.word.localeCompare(second.word),
    );

  return {
    answer,
    rankByWord: new Map(rankedWords.map(({ word }, index) => [word, index + 1])),
  };
}
