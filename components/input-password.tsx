"use client";

import { Input, type InputProps } from "@heroui/input";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { EyeFilledIcon, EyeSlashFilledIcon } from "@/components/icons";

export default function InputPassword(props: InputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const toggleVisibility = () => setIsVisible(!isVisible);

  const handleCopy = async () => {
    const textToCopy =
      typeof props.value === "string"
        ? props.value
        : typeof props.defaultValue === "string"
          ? props.defaultValue
          : "";

    if (!textToCopy) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard", err);
    }
  };

  return (
    <Input
      {...props}
      endContent={
        <div className="flex items-center gap-2">
          <button
            aria-label="Copy to clipboard"
            className="focus:outline-none cursor-pointer text-default-400 hover:text-default-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!props.value && !props.defaultValue}
            type="button"
            onClick={handleCopy}
          >
            {isCopied ? (
              <Check className="w-5 h-5 text-success pointer-events-none" />
            ) : (
              <Copy className="w-5 h-5 pointer-events-none" />
            )}
          </button>
          <button
            aria-label="toggle password visibility"
            className="focus:outline-none cursor-pointer"
            type="button"
            onClick={toggleVisibility}
          >
            {isVisible ? (
              <EyeSlashFilledIcon className="text-2xl text-default-400 pointer-events-none" />
            ) : (
              <EyeFilledIcon className="text-2xl text-default-400 pointer-events-none" />
            )}
          </button>
        </div>
      }
      type={isVisible ? "text" : "password"}
    />
  );
}
