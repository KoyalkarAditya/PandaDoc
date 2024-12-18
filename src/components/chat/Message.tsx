import { cn } from "@/lib/utils";
import { ExtendedMessage } from "@/types/message";
import { Icons } from "../Icons";
import ReactMarkDown from "react-markdown";
import { format } from "date-fns";

interface MessageProps {
  message: ExtendedMessage;
  isNextSamePerson: boolean;
}

const Message = ({ message, isNextSamePerson }: MessageProps) => {
  return (
    <div
      className={cn("flex items-end", {
        "justify-end": message.isUserMessage,
      })}
    >
      <div
        className={cn(
          "relative flex h-6 aspect-square items-center justify-center ",
          {
            "order-2 bg-blue-600 rounded-sm": message.isUserMessage,
            "order-1 bg-inc-800 rounded-sm": !message.isUserMessage,
            hidden: isNextSamePerson,
          }
        )}
      >
        {message.isUserMessage ? (
          <Icons.user className="fill-inc-200 text-inc-200 h-3/4 w-3/4" />
        ) : (
          <Icons.logo className="fill-zinc-800 h-3/4 w-3/4" />
        )}
      </div>
      <div
        className={cn("flex flex-col space-y-2 text-base max-w-md mx-2", {
          "order-1 items-end": message.isUserMessage,
          "order-1 items-start": !message.isUserMessage,
        })}
      >
        <div
          className={cn("px-4 py-2 rounded-lg inline-block", {
            "bg-blue-600 text-white": message.isUserMessage,
            "bg-gray-200 text-gray-900": !message.isUserMessage,
            "rounded-br-none": message.isUserMessage && !isNextSamePerson,
            "rounded-bl-none": !isNextSamePerson && !message.isUserMessage,
          })}
        >
          {typeof message.text == "string" ? (
            <ReactMarkDown
              className={cn("prose", {
                "text-zinc-50": message.isUserMessage,
              })}
            >
              {message.text}
            </ReactMarkDown>
          ) : (
            message.text
          )}
          {message.id != "loading-message" ? (
            <div
              className={cn("text-xs select-none mt-2 w-full text-right", {
                "text-zinc-500": !message.isUserMessage,
                "text-blue-300": message.isUserMessage,
              })}
            >
              {format(new Date(message.createdAt), "HH:mm")}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
export default Message;
// 8 : 13 : 04
