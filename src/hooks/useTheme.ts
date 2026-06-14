import { useState, useEffect } from "react";

export function useTheme() {
  const [theme, setTheme] = useState<string>("azure");

  useEffect(() => {
    const savedTheme = localStorage.getItem("rect_theme") || "azure";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const changeTheme = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("rect_theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  return { theme, changeTheme };
}
