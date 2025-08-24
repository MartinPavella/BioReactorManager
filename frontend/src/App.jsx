import React, {useState} from "react";
import ChartsTab from "./components/ChartsTab.jsx";
import HighLevelControlsTab from "./components/HighLevelControlsTab.jsx";
import LowLevelControlsTab from "./components/LowLevelControlsTab.jsx";
import ConfigurationTab from "./components/ConfigurationTab.jsx";
import "./App.css";

const App = () => {
    const [activeTab, setActiveTab] = useState("highlevel"); // NEW state for tab navigation

    return (
        <div className="flex flex-col items-center min-h-screen bg-gray-100">
            {/* Header */}
            <h1 className="text-4xl font-extrabold text-green-700 my-8">
                Nitroduck BioReactor
            </h1>

            {/* Tabs navigation */}
            <div className="flex w-full max-w-3xl border-b border-gray-300">
                <button
                    onClick={() => setActiveTab("highlevel")}
                    className={`flex-1 py-3 text-lg font-semibold transition-colors ${
                        activeTab === "highlevel"
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    } rounded-t-md`}
                >
                    Home
                </button>
                <button
                    onClick={() => setActiveTab("charts")}
                    className={`flex-1 py-3 text-lg font-semibold transition-colors ${
                        activeTab === "charts"
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    } rounded-t-md`}
                >
                    Monitor
                </button>
                <button
                    onClick={() => setActiveTab("lowlevel")}
                    className={`flex-1 py-3 text-lg font-semibold transition-colors ${
                        activeTab === "lowlevel"
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    } rounded-t-md`}
                >
                    Fine controls
                </button>
                <button
                    onClick={() => setActiveTab("config")}
                    className={`flex-1 py-3 text-lg font-semibold transition-colors ${
                        activeTab === "config"
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    } rounded-t-md`}
                >
                    Config
                </button>
            </div>

            {/* Tab content */}
            <div className="w-full max-w-3xl flex-grow p-6 flex justify-center">
                {activeTab === "highlevel" && <HighLevelControlsTab/>}
                {activeTab === "charts" && <ChartsTab/>}
                {activeTab === "lowlevel" && <LowLevelControlsTab/>}
                {activeTab === "config" && <ConfigurationTab/>}
            </div>
        </div>
    );
};

export default App;
