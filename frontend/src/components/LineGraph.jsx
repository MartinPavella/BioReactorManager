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

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend);
const backend_uri = "http://bioreactor.local:8000";

const LineChart = ({layerId}) => {
    const [chartData, setChartData] = useState(null);

    useEffect(() => {

        fetch(`${backend_uri}/get-probe-data/${layerId}`)
            .then((res) => res.json())
            .then((values) => {
                const labels = values.map((_, index) => index + 1);
                setChartData({
                    labels,
                    datasets: [
                        {
                            label: `Biomass`,
                            data: values,
                            borderColor: `hsl(${layerId * 60}, 70%, 50%)`,
                            tension: 0.1,
                        },
                    ],
                });
            })
            .catch((err) => console.error(`Error fetching chart data for layer ${layerId}:`, err));
    }, [layerId]);

    return (
        <div className="w-full mb-6"> {/* spacing between charts */}
            <h2 className="text-center mb-2">Layer {5 - layerId}</h2>
            <div style={{height: "200px"}}>
                {chartData ? (
                    <Line
                        data={chartData}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false, // chart fills height: 200px
                            plugins: {
                                legend: {
                                    position: "top",
                                },
                                title: {
                                    display: false, // we already use our own <h2>
                                },
                            },
                        }}
                    />
                ) : (
                    <p className="text-center">Loading data for layer {layerId}...</p>
                )}
            </div>
        </div>
    );
};

export default LineChart;
