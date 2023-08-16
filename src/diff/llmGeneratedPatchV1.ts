/* eslint-disable @typescript-eslint/naming-convention */

import { XMLParser } from 'fast-xml-parser';

type Chunk = string;

interface Change {
  description: string;
  oldChunk: Chunk;
  newChunk: Chunk;
}

interface FileChangeOutput {
  change: Change[];
}

export interface LlmGeneratedPatchXmlV1 {
  fileChangeOutput: FileChangeOutput;
}


export function parseLlmGeneratedPatchV1(xml: string): LlmGeneratedPatchXmlV1 | undefined {
  const options = {
    textNodeName: "text",
    ignoreAttributes: false,

    // Convert old-chunk to oldChunk
    transformTagName: (tagName: string) => {
      return tagName.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
    },

    // Make sure change is always an array, even if there is only one change
    // isArray: (name: string, jpath: string) => {
    //   console.log('jpath', jpath);
    //   if(name === 'change') {
    //     return true;
    //   }
    //   return false;
    // }
  };

  /**
   * Debt (Kirill): Use zod or similar to construct the final typed patch
   */
  const jsonObj: LlmGeneratedPatchXmlV1 = new XMLParser(options).parse(xml);
  return jsonObj;
}

