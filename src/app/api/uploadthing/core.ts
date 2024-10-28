import { db } from "@/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { pinecone } from "@/lib/pinecone";

import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
//import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";

const f = createUploadthing();

export const ourFileRouter = {
  pdfUploader: f({ pdf: { maxFileSize: "4MB" } })
    .middleware(async ({ req }) => {
      const { getUser } = getKindeServerSession();
      const user = await getUser();

      if (!user) throw new UploadThingError("Unauthorized");

      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const createdFile = await db.file.create({
        data: {
          key: file.key,
          name: file.name,
          userId: metadata.userId,
          url: file.appUrl,
          uploadStatus: "PROCESSING",
        },
      });

      try {
        const response = await fetch(file.appUrl);
        const blob = await response.blob();
        const loader = new PDFLoader(blob);
        const pageLevelDocs = await loader.load();
        const pagesAmt = pageLevelDocs.length;

        const embeddings = new GoogleGenerativeAIEmbeddings({
          model: "text-embedding-004",
          apiKey: process.env.GEMINI_API_KEY,
          taskType: TaskType.RETRIEVAL_DOCUMENT,
          title: "Document title",
        });

        const pineconeIndex = pinecone.Index("pandadoc");
        await PineconeStore.fromDocuments(pageLevelDocs, embeddings, {
          //@ts-ignore
          pineconeIndex,
          namespace: createdFile.id,
        });

        // //vectorize and index entire doc
        // const pineconeIndex = pinecone.Index("pandadoc");
        // const embiddings = new OpenAIEmbeddings({
        //   apiKey: process.env.OPENAI_API_KEY,
        // });
        // await PineconeStore.fromDocuments(pageLevelDocs, embiddings, {
        //   //@ts-ignore
        //   pineconeIndex,
        //   namespace: createdFile.id,
        // });

        await db.file.update({
          data: {
            uploadStatus: "SUCCESS",
          },
          where: {
            id: createdFile.id,
          },
        });
      } catch (e) {
        await db.file.update({
          data: {
            uploadStatus: "FAILED",
          },
          where: {
            id: createdFile.id,
          },
        });
        console.log(e + "is the error:::::::");
      }
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

const axios = require("axios");

async function generateGeminiEmbedding(text: string) {
  try {
    const response = await axios.post("https://api.gemini.com/embedding", {
      headers: {
        Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      data: {
        input: text,
      },
    });

    return response.data.embedding; // Assuming `embedding` holds the vector result.
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}
