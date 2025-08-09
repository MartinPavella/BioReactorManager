// src/components/LineChart.js
import React, {useEffect, useState} from "react";
import {Line} from "react-chartjs-2";
import {
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
} from "chart.js";

ChartJS.register(
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Title,
    Tooltip,
    Legend
);
const backend_uri = "http://192.168.0.102:8000";

const LineChart = () => {
    const [chartData, setChartData] = useState(null);

    useEffect(() => {
        // TODO Only layer `0` is used for testing.
        fetch(backend_uri + `/get-probe-data/0`)
            .then((res) => {
                if (!res.ok) throw new Error("Network response was not ok");
                return res.json();
            })
            .then((values) => {
                const labels = values.map((_, index) => index + 1);

                setChartData({
                    labels,
                    datasets: [
                        {
                            label: "Biomass",
                            data: values,
                            borderColor: "rgb(75, 192, 192)",
                            tension: 0.1,
                        },
                    ],
                });
            })
            .catch((err) => console.error("Error fetching chart data:", err));
    }, []);

    return (
        <div style={{width: "600px", height: "400px", margin: "auto"}}>
            <h2>PROBE 1</h2>
            {chartData ? <Line data={chartData}/> : <p>Loading...</p>}
        </div>
    );
};

export default LineChart;
