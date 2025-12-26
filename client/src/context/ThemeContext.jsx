import { createContext, useState, useEffect } from "react";

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem("app-theme") || "light";
    });

    useEffect(() => {
        localStorage.setItem("app-theme", theme);
        document.documentElement.className = `theme-${theme}`;
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === "light" ? "dark" : "light"));
    };

    const setThemeByName = (name) => {
        if (["light", "dark"].includes(name)) {
            setTheme(name);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setThemeByName }}>
            {children}
        </ThemeContext.Provider>
    );
};
