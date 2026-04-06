import { Moon, Sun } from "lucide-react"
import { useTheme } from "./theme-provider"

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()

    return (
        <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center transition-colors hover:bg-secondary/80"
            aria-label="Toggle theme"
        >
            {theme === "dark" ? (
                <Moon className="w-5 h-5 text-foreground" />
            ) : (
                <Sun className="w-5 h-5 text-foreground" />
            )}
        </button>
    )
}
