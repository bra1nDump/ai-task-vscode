
# Messages submitted:

## [system]:
```md
Creating changes:
- Only make changes based on your task
- Only replace logically complete chunks of code. Avoid replacing sub expressions. Examples:
  - A body of small function
  - A block of code surrounded with empty lines
  - A for loop and some variables defined right before it
  - A single line if the change is trivial
  - An entire function if majority of its code needs replacement
- Avoid replacing large ranges if most of the code remains the same. Instead use multiple smaller targeted changes
- Make sure symbols you are using are available in scope or define them yourself
- Respect indentation of the original range you are replacing

Examples:

Given two files (omitted for brevity) and a task to make changes based on bread mentions. The following are acceptable changes to generate.
<change>
<path>src/hello-world.ts</path>
<range-to-replace>
function helloWorld() {
    // bread pass name to be greeted
    console.log('Hello World');
}
</range-to-replace>
<description>
Context: function
Input: name: thing to be greeted of type string
Output: void
1: Print out "Hello " followed by the name
<replacement>
function hello(name: string) {
    console.log(`Hello ${name}`);
}
</replacement>
</change>
<change>
<path>src/main.ts</path>
<range-to-replace>
// bread use hello world from a helper module and use environment variable to get the user name
</range-to-replace>
<description>
Context: top level code
1: Import hello function from helper module
2: Get user name from environment variable USER_NAME
3: Call hello function with user name
</description>
<replacement>
import { hello } from './helper';
const name = process.env.USER_NAME || 'World';
hello(name);
</replacement>
</change>


Given this file:
<file>
<path>counter.ts</path>
<content>
const Counter: React.FC = () => {
  const [count, setCount] = useState<number>(0);

  return (
    <div>
      <button onClick={() => count > 0 && setCount(count - 1)}>-</button>
      <button onClick={() => setCount(count + 1)}>+</button>
      <ul>
        {Array.from({ length: count }, 
          (_, i) => 
            <li key={i}>Item {i + 1}</li>)
        }
      </ul>
    </div>
  );
};
</content>
</file>

Given a task to refactor the code to use a single div instead of a list, the following are acceptable changes to generate.
<change>
<path>counter.ts</path>
<range-to-replace>
      <ul>
        {Array.from({ length: count }, 
          (_, i) => 
            <li key={i}>Item {i + 1}</li>)
        }
      </ul>
</range-to-replace>
<description>
Context: jsx subexpression
1: Show count value in a div
</description>
<replacement>
      <div>{count}</div>
</replacement>
</change>


Given this file:
<file>
<path>duplicate.ts</path>
<content>
function deduplicate(arr: number[]): number[] {
  const result: number[] = [];
  for (const item of arr) {
    if (!result.includes(item)) {
      result.push(item);
    }
  }
  return result;
}
</content>
</file>

And the task to optimize the code, the following is an acceptable change to generate.
<change>
<path>counter.ts</path>
<range-to-replace>
function deduplicate(arr: number[]): number[] {
  <truncated/>
  return result;
}
</range-to-replace>
<description>
Context: function
Input: arr: array of numbers
Output: array of numbers with duplicates removed
1: initialize a set to track unique numbers uniqueSet
2: initialize result array
3: for each item in arr
4:   if uniqueSet does not contain item
5:     add item to uniqueSet
6:     add item to result
7: return result
</description>
<replacement>
function deduplicate(arr: number[]): number[] {
  const uniqueSet = new Set<number>();
  const result: number[] = [];
  for (const item of arr) {
    if (!uniqueSet.has(item)) {
      result.push(item);
      uniqueSet.add(item);
    }
  }
  return result;
}
</replacement>
</change>


```

## [system]:
```md
Given files:
<file>
<path>fly.toml</path>
<content>
app = "mermaid-to-miro"
# app = "mermaid-to-miro-staging"
primary_region = "lax"

[build]
  dockerfile = "Dockerfile"

# https://fly.io/docs/reference/configuration/#the-http_service-section
[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  # Still need to run fly scale XX
  # where XX >= 2 for this to take affect
  min_machines_running = 2

[checks]
  [checks.render_sample_diagram]
    grace_period = "10s"
    interval = "1m"
    method = "get"
    path = "/health"
    protocol = "http"
    port = 3000
    timeout = "5s"
    type = "http"

@crust add a daily crone job to invoke /cleanup-stale-miro-boards to delete boards that were not opened in the last five days. edit this fly.toml to configure the cron job. Ad a top level function within miro to query the boards and de lead them accordingly, do not handle pagination. add route in the server to handle that request.
</content>
</file>
<file>
<path>src/miro.ts</path>
<content>
import { LaidOutGraph } from "./types";
import { config } from "./environment";

import axiosWrapper from "./axios-authenticated";
import { InfinityPool } from "./InfinityPool";

const randomFunnyAdjectives = [
  "adorable",
  "laughing",
  "grumpy",
  "jolly",
  "quirky",
];

const randomFunnyNouns = [
  "ninja",
  "panda",
  "unicorn",
  "pickle",
  "potato",
  "gnome",
];

function generateFunnyBoardName() {
  const randomAdjective =
    randomFunnyAdjectives[
      Math.floor(Math.random() * randomFunnyAdjectives.length)
    ];
  const randomNoun =
    randomFunnyNouns[Math.floor(Math.random() * randomFunnyNouns.length)];
  return `board-${randomAdjective}-${randomNoun}`;
}

async function boardFactory(): Promise<{ id: string; viewLink: string }> {
  // The heaviest call - takes just south of 1 second
  // We can prepare a bunch of boards in advance and then just use them?
  // How to set up authorization: https://developers.miro.com/docs/rest-api-build-your-first-hello-world-app
  const response: any = await axiosWrapper.post(
    "https://api.miro.com/v2/boards",
    {
      name: generateFunnyBoardName(),
      teamId: config.miro.enterpriseTeamId,
      // Needed to allow people to view the board without logging in
      policy: {
        sharingPolicy: {
          access: "edit",
        },
      },
    }
  );

  return response.data;
}

/**
 * Infinitely generate new boards an advance of up to two boards
 */
const boardPool = new InfinityPool(2, boardFactory);

export async function generateMiroBoard(graph: LaidOutGraph): Promise<string> {
  try {
    console.time("create empty miro board");

    const freshBoard = await boardPool.next();
    const freshBoardId = freshBoard.id;

    console.timeEnd("create empty miro board");

    console.log("boardId:", freshBoardId);

    const cards: Record<string, bigint> = {};
    (BigInt.prototype as any).toJSON = function () {
      return this.toString();
    };

    // These numbers were obtained by trial and error to make the board look good
    //
    // Normalize the x and y coordinates of the nodes by finding the minimum coordinate
    // and subtracting it from all node coordinates. This ensures that the coordinates
    // start from (0,0), making the visualization more centered and easier to interpret.
    const minX = Math.min(...graph.nodes.map((node) => node.x));
    const minY = Math.min(...graph.nodes.map((node) => node.y));
    console.log("minX and minY:", minX, minY);
    graph.nodes.forEach((node) => {
      node.x -= minX;
      node.y -= minY;
    });

    // https://developers.miro.com/reference/bulk-create-items
    // Takes roughly 1+ seconds to create one by one of them when using a map for 10 shapes
    // Will try bulk now: 0.5 seconds for 10 shapes!
    const shapeObjectCreateRequests = graph.nodes.map((node, _idx) => {
      // We scale down the sizes to make the board more readable at default zoom of 100%
      // Let's try not to fiddle around with scaling too much as it disturbs the original proportions
      // that mermaid figured out during layout
      const scaleMultiplier = 1;

      const body = {
        type: "shape",
        data: { content: node.name, shape: "round_rectangle" },
        style: {
          textAlignVertical: "middle",
          textAlign: "center",
          fontSize: 14,
          fillColor: "#d8defc",
          color: "#1a1a1a",
          borderColor: "#d8defc",
        },
        position: {
          x: node.x * scaleMultiplier,
          y: node.y * scaleMultiplier,
        },
        geometry: {
          height: node.height * scaleMultiplier,
          width: node.width * scaleMultiplier + 20,
        },
      };

      return body;
    });

    console.time("card_promises");
    const values = await axiosWrapper.post(
      `https://api.miro.com/v2-experimental/boards/${freshBoardId}/items/bulk`,
      shapeObjectCreateRequests
    );
    console.timeEnd("card_promises");

    /*
    Example response
    {
      "data": [
        {
          "id": "3458764562873766392",
          "type": "shape",
          "data": {
            "content": "",
            "shape": "rectangle"
          },
          ...
        }
      ],
      "type": "bulk-list"
    }
    */
    values.data.data.forEach((card: any, idx: number) => {
      cards[graph.nodes[idx].id] = BigInt(card.id);
    });

    // https://developers.miro.com/reference/create-connector
    // Does not have bulk api
    // ~500ms for 10 edges
    const edgeCreationResults = graph.edges.map(async (edge, idx: any) => {
      const fromCard = cards[edge.fromNodeWithId];
      const toCard = cards[edge.toNodeWithId];

      // Instead of simply detecting if there's a duplicate edge, find all the indices of the other edges. Distribute the new edge's position within the range 0% to 100% ordered by the indices. Make sure you plan this refactor thoroughly.
      const duplicateEdges = graph.edges.filter(
        (e) =>
          e.fromNodeWithId === edge.fromNodeWithId &&
          e.toNodeWithId === edge.toNodeWithId
      );

      const edgeIndex = duplicateEdges.indexOf(edge);
      const edgePosition =
        ((edgeIndex + 1) / (duplicateEdges.length + 1)) * 100;

      // It still kind of looks of due to y positions being hardcoded but it's too hard to fix this right now
      // Also am pretty sure the from and two are reversed in our parsing algorithm
      const body: any = {
        startItem: {
          position: {
            x: edgePosition.toString() + "%",
            y: "100%",
          },
          id: fromCard,
        },
        endItem: {
          position: {
            x: edgePosition.toString() + "%",
            y: "0%",
          },
          id: toCard,
        },
        style: {
          endStrokeCap: "arrow",
          color: "#000000",
          strokeWidth: 1.0,
          textOrientation: "horizontal",
        },
        shape: "curved",
      };

      if (edge.label) {
        body.captions = [
          {
            content: edge.label,
          },
        ];
      }

      console.log(body);

      return axiosWrapper.post(
        `https://api.miro.com/v2/boards/${freshBoardId}/connectors`,
        body
      );
    });

    console.time("edgeCreationResults");
    await Promise.all(edgeCreationResults);
    console.timeEnd("edgeCreationResults");

    console.log(freshBoard.viewLink);
    return freshBoard.viewLink;
  } catch (e) {
    console.error("error while generating miro board", e);
    throw e;
  }
}

export async function deleteHealthCheckBoard(boardId: string) {
  try {
    const response = await axiosWrapper.delete(
      `https://api.miro.com/v2/boards/${boardId}`
    );
    if (response.status !== 204) {
      console.error(`Error deleting board: ${response.status}`);
      return;
    }
    console.log("deleted health check board");
  } catch (e) {
    console.error("error while deleting health check board", e);
  }
}

</content>
</file>
<file>
<path>src/server.ts</path>
<content>
import express from "express";
import { deleteHealthCheckBoard, generateMiroBoard } from "./miro";
import { startPuppeteerAndLoadPage } from "./mermaid-page/startPuppeteerAndLoadPage";
import { evaluateMermaidRenderWithinPage } from "./mermaid-page/evaluateMermaidRenderWithinPage";
import { Page } from "puppeteer";
import { config } from "./environment";
import axiosWrapped from "./axios-authenticated";
import { execSync } from "child_process";
import { statuses } from "./publicApi";

const app = express();

app.use(express.json());

let pageWithMermaidPromise: Promise<Page> | undefined;

function killServerAndChromes() {
  console.log("Killing server and chrome processes");

  // If we do this locally this will kill our chromes, The chromes must live lol!
  if (config.isProduction)
    // not sure if chrome is killed if we kill the server, lets kill it explicitly just in case
    execSync("pkill -f chrome", { stdio: "inherit" });

  process.exit(99);
}

app.get("/health", async (req, res) => {
  const simpleDiagram = "graph LR; A-->B; B-->C; C-->A;";

  try {
    const response = await Promise.race([
      axiosWrapped.post("http://localhost:3000/convert", {
        diagramSource: simpleDiagram,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Timeout")),
          config.healthTimeoutMilliSeconds
        )
      ),
    ]);

    if (response.data?.miroBoardLink && response.data?.miroBoardLink !== "") {
      // Cleanup board to avoid contention on the account, don't wait.
      void deleteHealthCheckBoard(
        response.data.miroBoardLink.split("/").pop() ?? ""
      );

      res.status(200).send("OK");
    } else {
      res.status(500).send("Server is not healthy");
      killServerAndChromes();
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Server is not healthy");
    killServerAndChromes();
  }
});

app.post("/convert", async (req, res) => {
  const {
    diagramSource,
    shouldGenerateMiroBoard,
  }: {
    diagramSource: string;
    shouldGenerateMiroBoard?: boolean;
  } = req.body;

  console.log(req.body);

  try {
    if (!pageWithMermaidPromise) {
      pageWithMermaidPromise = startPuppeteerAndLoadPage();
    }
    let pageWithMermaid = await pageWithMermaidPromise;

    console.time("evaluateMermaidRenderWithinPage");
    const renderResult = await evaluateMermaidRenderWithinPage(
      diagramSource,
      pageWithMermaid
    );
    console.timeEnd("evaluateMermaidRenderWithinPage");

    console.log(
      "Mermaid render result:",
      renderResult.type === "error" ? `Error: ${renderResult.error}` : "success"
    );

    if (renderResult.type === "error") {
      return res.status(410).json({
        error: renderResult.error,
        status: statuses.errorLikelyDiagramSyntax,
      });
    }

    // During migration they will not be sending this field, so we need to default it to true
    if (shouldGenerateMiroBoard === false) {
      return res.json({
        diagramSvg: renderResult.svg,
        status: statuses.successDiagramSvgOnly,
      });
    }

    try {
      console.time("generateMiroBoard");
      const miroBoardLink = await generateMiroBoard(renderResult.laidOutGraph);
      console.timeEnd("generateMiroBoard");
      res.json({
        miroBoardLink,
        diagramSvg: renderResult.svg,
        status: statuses.successDiagramSvgAndMiro,
      });
    } catch (error) {
      console.error(
        "Error generating miro board, still sending the svg back",
        error
      );
      res.json({
        diagramSvg: renderResult.svg,
        error: "hidden",
        status: statuses.successWithDiagramSvgFailureWithMiro,
      });
    }
  } catch (error) {
    console.error(error);

    // After errors, lets recreate the page, this might backfire,
    // but might also help with the next generation :D
    //
    // Surprize surprize, it backfired, we got many ooms
    // Lets avoid starting too many puppetters, this error could be some regular syntax error
    // and we don't want to restart puppeteer for that. Lets rely on health just killing the system
    //
    // pageWithMermaidPromise = startPuppeteerAndLoadPage();

    res
      .status(500)
      .json({ error: "hidden", status: statuses.errorLikelyPuppeteerFailure });
  }
});

const port = process.env.PORT ?? 3000;
app.listen(port, () => {
  console.log("Server is running on port ", port);
});

</content>
</file>
```

## [user]:
```md


Your task is spread out across multiple files with main goals tagged with @bread
```

## [system]:
```md
Understanding the task:
- Collect all of the information relevant to the task the user is trying to accomplish and restate the task
- Restate any specific instructions that the user has already provided on how to accomplish the task 
- Used technical style of writing - be concise but do not lose any information
- Parts of the task might be accomplished, clearly state so and consider it stale instructions

Task output format:
<task>
{{restating the task}}
</task>
```

## [system]:
```md
In your next message respond only with the task immediately followed by the changes to be made to the files.
```

# [assistant, latest response]:
```md
<task>
The task involves implementing a daily cron job to invoke the '/cleanup-stale-miro-boards' endpoint to delete Miro boards which haven't been opened in the last five days. 

This task involves the following:
1. Edit the 'fly.toml' file to configure a cron job.
2. Add a function within the 'miro.ts' file to query the boards and delete them accordingly.
3. Add a new route in the 'server.ts' file to handle the requests made to the '/cleanup-stale-miro-boards' endpoint.

Note: Pagination should not be handled in this task.
</task>

<change>
<path>fly.toml</path>
<range-to-replace>
# @crust
</range-to-replace>
<description>
Context: top level configuration
1: Add a daily cron job to invoke the /cleanup-stale-miro-boards endpoint
</description>
<replacement>
[cron]
  daily_cleanup = { schedule = "0 0 * * *", command = "curl http://localhost:3000/cleanup-stale-miro-boards" }
</replacement>
</change>

<change>
<path>src/miro.ts</path>
<range-to-replace>
export async function deleteHealthCheckBoard(boardId: string) {
  try {
    const response = await axiosWrapper.delete(
      `https://api.miro.com/v2/boards/${boardId}`
    );
    if (response.status !== 204) {
      console.error(`Error deleting board: ${response.status}`);
      return;
    }
    console.log("deleted health check board");
  } catch (e) {
    console.error("error while deleting health check board", e);
  }
}
</range-to-replace>
<description>
Context: function
Input: None
Output: Promise<void>
1: Query all boards
2: For each board, if it has not been opened in the last five days, delete it
</description>
<replacement>
export async function cleanupStaleMiroBoards(): Promise<void> {
  try {
    // Query all boards
    const response = await axiosWrapper.get(`https://api.miro.com/v2/boards`);
    const boards = response.data;
    
    // Get date from five days ago
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    for (const board of boards) {
      const lastOpenedDate = new Date(board.lastOpenedAt);
      
      // If the board has not been opened in the last five days, delete it
      if (lastOpenedDate < fiveDaysAgo) {
        await axiosWrapper.delete(`https://api.miro.com/v2/boards/${board.id}`);
      }
    }
    
    console.log("Deleted stale Miro boards");
  } catch (e) {
    console.error("Error while cleaning up stale Miro boards", e);
  }
}
</replacement>
</change>

<change>
<path>src/server.ts</path>
<range-to-replace>
app.listen(port, () => {
  console.log("Server is running on port ", port);
});
</range-to-replace>
<description>
Context: top level code
1: Import cleanupStaleMiroBoards function from miro module
2: Add /cleanup-stale-miro-boards route that calls cleanupStaleMiroBoards function when invoked
3: Start the server
</description>
<replacement>
import { cleanupStaleMiroBoards } from './miro';
10
app.post('/cleanup-stale-miro-boards', async (req, res) => {
  try {
    await cleanupStaleMiroBoards();
    res.status(200).send("Stale Miro boards cleaned up");
  } catch (e) {
    res.status(500).send("Failed to clean up stale Miro boards");
  }
});

app.listen(port, () => {
  console.log("Server is running on port ", port);
});
</replacement>
</change>