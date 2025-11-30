"use client";

import { Input, type InputProps } from "@heroui/input";
import { useState } from "react";

import { EyeFilledIcon, EyeSlashFilledIcon } from "@/components/icons";

export default function InputPassword(props: InputProps) {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => setIsVisible(!isVisible);

  return (
    <Input
      {...props}
      endContent={
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
      }
      type={isVisible ? "text" : "password"}
    />
  );
}
