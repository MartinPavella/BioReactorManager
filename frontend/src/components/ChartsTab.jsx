import LineChart from "./LineGraph.jsx";

function ChartsTab() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
            {[0, 1, 2, 3, 4].map((layerId) => (
                <LineChart key={layerId} layerId={layerId}/>
            ))}
        </div>
    );
}

export default ChartsTab;
