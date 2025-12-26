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
  Legend
} from "chart.js";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
);

import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";

const SignalGraph = ({ history }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";
  const textColor = isDark ? "#94a3b8" : "#6b7280";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";

  if (!history || history.length === 0) return null;

  const data = {
    labels: history.map((h) => h.time),
    datasets: [
      {
        label: "Vehicles",
        data: history.map((h) => h.vehicles),
        borderWidth: 2,
        tension: 0.4,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        pointBackgroundColor: isDark ? "#3b82f6" : "white",
        fill: true,
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        labels: { color: textColor }
      }
    },
    scales: {
      x: {
        ticks: { color: textColor },
        grid: { color: gridColor }
      },
      y: {
        ticks: { color: textColor },
        grid: { color: gridColor },
        beginAtZero: true
      }
    }
  };

  return <Line data={data} options={options} />;
};

export default SignalGraph;
