import { db } from "@/db";
import { generationConfig, model } from "@/lib/ai";
import { pinecone } from "@/lib/pinecone";
import { sendMessageValidator } from "@/lib/validators/SendMessageValidator";
import { TaskType } from "@google/generative-ai";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PineconeStore } from "@langchain/pinecone";
import { NextRequest } from "next/server";

export const POST = async (req: NextRequest) => {
  const body = await req.json();

  const { getUser } = getKindeServerSession();
  const user = await getUser();
  const { id: userId } = user;
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { fileId, message } = sendMessageValidator.parse(body);
  const file = await db.file.findFirst({
    where: {
      id: fileId,
      userId,
    },
  });
  if (!file) {
    return new Response("Not Found", { status: 404 });
  }
  await db.message.create({
    data: {
      text: message,
      isUserMessage: true,
      userId,
      fileId,
    },
  });
  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "text-embedding-004",
    apiKey: process.env.GEMINI_API_KEY,
    taskType: TaskType.RETRIEVAL_DOCUMENT,
    title: "Document title",
  });
  const pineconeIndex = pinecone.Index("pandadoc");

  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    //@ts-ignore
    pineconeIndex,
    namespace: file.id,
  });
  const results = await vectorStore.similaritySearch(message, 4);

  const prevMessages = await db.message.findMany({
    where: {
      fileId: file.id,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 6,
  });

  const formattedMessages = prevMessages.map((message) => ({
    role: message.isUserMessage ? ("user" as const) : ("assistant" as const),
    parts: [
      {
        text: message.text,
      },
    ],
  }));

  const chatSession = model.startChat({
    generationConfig,
    history: formattedMessages,
  });

  const prompt = `  {
        role: 'system',
        content:
          'Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format.',
      },
      {
        role: 'user',
        content: Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format. \nIf you don't know the answer, just say that you don't know, don't try to make up an answer. 
      }
        /n/n use the previous data to answer
  CONTEXT:
  ${results.map((r) => r.pageContent).join("/n/n")}
  USER INPUT: ${message}`;

  try {
    const response = await chatSession.sendMessage(prompt);
    const answer = response.response.text();
    await db.message.create({
      data: {
        text: answer,
        isUserMessage: false,
        fileId,
        userId,
      },
    });

    return answer;
  } catch (e) {
    console.log(e);
  }
};
