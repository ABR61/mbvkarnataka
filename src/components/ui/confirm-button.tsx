"use client";

import type { ButtonHTMLAttributes } from "react";

/** A submit button that asks for confirmation first (for use inside a plain
 *  server-action <form>). */
export function ConfirmButton({
  message,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { message: string }) {
  return (
    <button
      type="submit"
      {...props}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    />
  );
}
