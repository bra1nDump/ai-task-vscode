/* eslint-disable @typescript-eslint/naming-convention */

import { XMLParser } from 'fast-xml-parser';

type Chunk = string;

interface Change {
  description: string;
  oldChunk: Chunk;
  newChunk: Chunk;
}

interface FileChangeOutput {
  changes: Change[];
}

export interface LlmGeneratedPatchXmlV1 {
  fileChangeOutput: FileChangeOutput;
}

function extractContentBetweenTags(xml: string, tag: string): string[] {
  const tagLength = tag.length;

  const contents = [];
  let startIndex = xml.indexOf(`<${tag}`);

  while (startIndex !== -1) {
    // Extract attributes (later)

    const endIndex = xml.indexOf(`</${tag}>`, startIndex);
    if (endIndex !== -1) {
      const contentStart = startIndex + tagLength + 2; // 2 for < and >
      const contentEnd = endIndex;
      contents.push(xml.substring(contentStart, contentEnd));
      startIndex = xml.indexOf(`<${tag}>`, endIndex + tagLength + 3); // 3 for </, > and start next search after this end tag
    } else {
      // If end index is not found, assume we are streaming and the end tag is not there yet
      // So just return the content from the start tag to the end of the string
      const partialContent = xml.substring(startIndex + tagLength + 2); // 2 for < and >
      
      // We might have started printing out the closing tag.
      // Remove any prefix of the tag that appear as a suffix of the content.
      // We need to generate all possible prefixes of the end tag (including an empty string) 
      //   and check if they are a suffix of the content 
      for (let i = tagLength + 3; i >= 0; i--) {
        const partiallyPrintedEndTag = `</${tag}>`.substring(0, i);
        if (partialContent.endsWith(partiallyPrintedEndTag)) {
          // Remove the partially printed end tag from the content
          const content = partialContent.substring(0, partialContent.length - partiallyPrintedEndTag.length);
          contents.push(content);
          break;
        }
      }

      break;
    }
  }

  return contents;
}

export function parseLlmGeneratedPatchV1WithHandWrittenParser(xml: string): LlmGeneratedPatchXmlV1 | undefined {
  const fileChangeOutputs = extractContentBetweenTags(xml, 'file-change-output');

  if (fileChangeOutputs.length === 0) {
    return undefined;
  }

  const changes = extractContentBetweenTags(fileChangeOutputs[0], 'change').map(changeXml => {
    const description = extractContentBetweenTags(changeXml, 'description')[0];
    const oldChunk = extractContentBetweenTags(changeXml, 'old-chunk')[0];
    const newChunk = extractContentBetweenTags(changeXml, 'new-chunk')[0];
    return { description, oldChunk, newChunk };
  });

  return { fileChangeOutput: { changes: changes } };
}

/**
 * Has numerous issues:
 * - Nested tags can act up
 * - Needs a patch to have stop nodes actually work with javascript code contents
 * - [Critical] No streaming support https://github.com/NaturalIntelligence/fast-xml-parser/issues/318
 */
export function parseLlmGeneratedPatchV1WithFastXmlParser(xml: string): LlmGeneratedPatchXmlV1 | undefined {
  const options = {
    ignoreAttributes: false,
    attributeNamePrefix: '',

    // Convert old-chunk to oldChunk
    // IMPORTANT: This will change the tag names before the stopNodes are applied
    // but it still looks for the old name in the text tho ...
    // so these 2 options are incompatible unfortunately :(
    // transformTagName: (name: string) => ...

    /** Our payloads contain code and code might be xml itself or just have < and > in it
     * Do not parse it as xml
     * 
     * From documentation
     * https://github.com/NaturalIntelligence/fast-xml-parser/blob/master/docs/v4/2.XMLparseOptions.md#stopnodes
     * 
     * Downside of using dynamic path like *.old-chunk:
     * Note that in practice this didn't even work at all giving error of: 
     * unexpected end of new-chunk where < is used in the new-chunk
     * 
     * Note that a stop node should not have same closing node in contents. Eg
     * <stop>
     * invalid </stop>
     * </stop>
     * 
     * Nested stop notes are also not allowed
     * 
     * <stop>
     *     <stop> invalid </stop>
     * </stop>
     */
    stopNodes: [
      'file-change-output.change.old-chunk', 
      'file-change-output.change.new-chunk',
    ],

    // Make sure change is always an array, even if there is only one change
    isArray: (name: string, jpath: string) => {
      if(name === 'change') {
        return true;
      }
      return false;
    }
  };

  /**
   * Debt (Kirill): Use zod or similar to construct the final typed patch
   */
  const jsonObj: LlmGeneratedPatchXmlV1 = new XMLParser(options).parse(xml);
  
  function transformKeyNamesInObject(obj: any, transform: (key: string) => string): any {
    if (Array.isArray(obj)) {
      return obj.map(item => transformKeyNamesInObject(item, transform));
    } else if (typeof obj === 'object' && obj !== null) {
      const newObj: any = {};
      for (const key in obj) {
        const newKey = transform(key);
        newObj[newKey] = transformKeyNamesInObject(obj[key], transform);
      }
      return newObj;
    } else {
      return obj;
    }
  }

  const jsonWithCamelCasingKeys = transformKeyNamesInObject(jsonObj, (key: string) => {
      // Change to plural for readability
      if (key === 'change') {
        return 'changes';
      }

      // Change to camel case
      return key.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
    },
  );
  
  return jsonWithCamelCasingKeys;
}

/*
This shit is messing it up
const tagData = readTagExp(xmlData, i, '>')

          if (tagData) {
            const openTagName = tagData && tagData.tagName;
            if (openTagName === tagName && tagData.tagExp[tagData.tagExp.length-1] !== "/") {
              openTagCount++;
            }
            i=tagData.closeIndex;
          }

from OrederedObjParser, readStopNodeData method
It thinks < ... antying > needs to have a closing tag. How did this shit ever parse html lol ???
It has scripts right!!!
Maybe I should use scripts?

So removing that case from the function solved the problem
 */