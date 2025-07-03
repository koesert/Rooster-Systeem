import { useEffect } from "react";

export const usePageTitle = (title: string) => {
  useEffect(() => {
    // Set title immediately to prevent flashing
    document.title = title;
  }, [title]);
};
