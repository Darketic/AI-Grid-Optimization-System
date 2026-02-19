import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const UsageChart = ({ regions }) => {
  const data = {
    labels: regions.map(r => r.name),
    datasets: [{
      label: "Energy Usage (kWh)",
      data: regions.map(r => r.usage)
    }]
  };

  return <Bar data={data} />;
};

export default UsageChart;
