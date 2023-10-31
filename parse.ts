import * as path from "https://deno.land/std@0.204.0/path/mod.ts";

const exists = async (filename: string): Promise<boolean> => {
  try {
    await Deno.stat(filename);
    // successful, file or directory must exist
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      // file or directory does not exist
      return false;
    } else {
      // unexpected error, maybe permissions, pass it along
      throw error;
    }
  }
};

export async function parseToCreatorJSON(targetPath?: string) {
  const currentDir = path.dirname(path.fromFileUrl(import.meta.url));

  const [givenFilePath = targetPath, comment = "Migration file"] = Deno.args;

  if (!givenFilePath) {
    throw new TypeError("No file path given");
  }

  const targetFilePath = path.isAbsolute(givenFilePath)
    ? givenFilePath
    : path.resolve(givenFilePath);

  const fileName = path.basename(targetFilePath);

  const fileContent = await Deno.readTextFile(targetFilePath);

  const parsedContent: {
    ResourceRecordSets: Array<{
      Name: string;
      Type: string;
      TTL: number;
      ResourceRecords: Array<{
        Value: string;
      }>;
    }>;
  } = JSON.parse(fileContent);

  const outputFileName = "parsed-".concat(fileName);

  const outputFileDirPath = path.resolve(currentDir, "parsed");

  const outputFilePath = path.join(
    outputFileDirPath,
    outputFileName,
  );

  if (!(await exists(outputFileDirPath)))
    await Deno.mkdir(outputFileDirPath, { recursive: true });

  if (await exists(outputFilePath)) {
    await Deno.remove(outputFilePath);
  } else {
    await Deno.create(outputFilePath);
  }

  const notesFile = await Deno.open(outputFilePath, {
    write: true,
    create: true,
    truncate: true,
  });

  const encoder = new TextEncoder();

  const output = {
    Comment: comment,
    Changes: [] as Array<{
      Action: string;
      ResourceRecordSet: {
        Name: string;
        Type: string;
        TTL: number;
        ResourceRecords: Array<{
          Value: string;
        }>;
      };
    }>,
  };

  const excludedTypes = ["NS", "SOA"];

  for (const record of parsedContent.ResourceRecordSets) {
    if (!excludedTypes.includes(record.Type)) {
      output.Changes.push({
        Action: "CREATE",
        ResourceRecordSet: record,
      });
    }
  }

  const notes = new Uint8Array([
    ...encoder.encode(JSON.stringify(output, null, 2)),
    ...encoder.encode("\n"),
  ]);

  await notesFile.write(notes);

  notesFile.close();
}

if (import.meta.main) await parseToCreatorJSON();
