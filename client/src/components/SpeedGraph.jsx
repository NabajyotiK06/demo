import {
    Line
} from "react-chartjs-2";
import {
    Chart as ChartJS,
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Tooltip,
    Legend,
    Filler
} from "chart.js";

ChartJS.register(
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Tooltip,
    Legend,
    Filler
);

import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";

const SpeedGraph = ({ history }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === "dark";
    const textColor = isDark ? "#94a3b8" : "#6b7280";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";

    if (!history || history.length === 0) return null;

    const data = {
        labels: history.map((h) => h.time),
        datasets: [
            {
                label: "Avg Speed (km/h)",
                data: history.map((h) => h.avgSpeed),
                borderColor: "#8b5cf6", // Purple
                backgroundColor: "rgba(139, 92, 246, 0.1)",
                fill: true,
                tension: 0.4,
                pointRadius: 2,
                pointBackgroundColor: isDark ? "#8b5cf6" : "white"
            }
        ]
    };

    const options = {
        responsive: true,
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

    return <Line data={data} options={options} />;
};

export default SpeedGraph;
