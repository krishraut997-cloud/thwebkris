# Context Guess semantic model

Context Guess uses an original 1,500-word English vocabulary. It does not use or reproduce Contexto's proprietary vocabulary, rankings, or model.

The 1,500-word vocabulary starts with a small set of broad topic words, then fills from the MIT-licensed [FrequencyWords English frequency list](https://github.com/hermitdave/FrequencyWords), excluding common function words and conversational fragments. The build-time generator creates normalized word embeddings using the Apache-2.0 [Xenova/all-MiniLM-L6-v2](https://huggingface.co/Xenova/all-MiniLM-L6-v2) model. The game ranks the 1,500 words by cosine similarity to the puzzle answer. Guesses not in this vocabulary display `#1501+`.

The generated vectors are quantized to signed 8-bit values and served as a small static asset. The trained model itself runs only when regenerating the data; players do not need to download model weights. Third-party license texts are included under [`public/licenses`](./public/licenses).

Regenerate the data with:

```sh
npm run generate:context-data
```

The command downloads the public frequency list and model weights. Commit the generated `public/context-vocabulary.json` and `public/context-vectors.bin` files with any vocabulary/model update.
