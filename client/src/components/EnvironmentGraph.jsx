import {
    Bar
} from "react-chartjs-2";
import {
    Chart as ChartJS,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend
} from "chart.js";

ChartJS.register(
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend
);

import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";

const EnvironmentGraph = ({ history }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === "dark";
    const textColor = isDark ? "#94a3b8" : "#6b7280";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";

    if (!history || history.length === 0) return null;

    const data = {
        labels: history.map((h) => h.time),
        datasets: [
            {
                label: "Air Quality Index (AQI)",
                data: history.map((h) => h.aqi),
                backgroundColor: history.map(h => {
                    if (h.aqi > 200) return "#ef4444"; // high pollution (red)
                    if (h.aqi > 100) return "#f59e0b"; // moderate (yellow)
                    return "#10b981"; // good (green)
                }),
                borderRadius: 4,
            }
        ]
    };

    const options = {
        responsiveness: true,
        plugins: {
            legend: { display: false }
        },
        scales: {
            x: {
                ticks: { color: textColor },
                grid: { color: gridColor }
            },
            y: {
                beginAtZero: true,
                ticks: { color: textColor },
                grid: { color: gridColor }
            }
        }
    };

    return <Bar data={data} options={options} />;
};

export default EnvironmentGraph;
