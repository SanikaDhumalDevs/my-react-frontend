import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
// import "./Consume.css"; // REMOVED: Replaced with Tailwind

// ✅ Import your background image from src/assets
import bgImage from "../assets/img2.jpg";

const Consume = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { item, email, username } = location.state || {};
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (item?.itemName) {
      setLoading(true);
      setError("");
      axios
        .post("http://localhost:5001/recipes", { itemName: item.itemName })
        .then((res) => {
          const recipeList = Array.isArray(res.data.recipes) ? res.data.recipes : [];
          setRecipes(recipeList);
        })
        .catch((err) => {
          console.error("Error fetching recipes:", err);
          setError("Failed to fetch recipes. Please try again later.");
        })
        .finally(() => setLoading(false));
    }
  }, [item]);

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat relative font-sans"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Dark Overlay to make text readable over the background image */}
      <div className="absolute inset-0 bg-slate-950/90 z-0" />

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto p-6">
        
        {/* Header Section */}
        <header className="text-center mb-12 mt-8">
           {/* Back Button */}
           <button 
            onClick={() => navigate(-1)}
            className="absolute top-6 left-6 text-slate-400 hover:text-white transition-colors flex items-center gap-2 font-medium"
          >
            ← Back
          </button>

          <h2 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 mb-4">
            Consume Product
          </h2>
          
          <div className="flex flex-col md:flex-row justify-center gap-4 md:gap-8 text-slate-300 text-sm md:text-base">
            <p className="bg-slate-900/50 px-4 py-2 rounded-full border border-slate-700">
              Logged in as: <strong className="text-purple-300">{username || email}</strong>
            </p>
            <p className="bg-slate-900/50 px-4 py-2 rounded-full border border-slate-700">
              Generating recipes for: <strong className="text-emerald-300 text-lg uppercase tracking-wide">{item?.itemName}</strong>
            </p>
          </div>
        </header>

        {/* Recipes Grid */}
        <div className="recipes-section min-h-[50vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center mt-20">
              <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-xl text-slate-300 animate-pulse">🤖 AI is cooking up recipes...</p>
            </div>
          ) : error ? (
            <div className="text-center mt-20 bg-red-500/10 border border-red-500/30 p-6 rounded-2xl max-w-xl mx-auto">
              <p className="text-red-400 text-lg font-bold">{error}</p>
            </div>
          ) : recipes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {recipes.map((recipe, idx) => (
                <div 
                  className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-2xl p-6 shadow-xl hover:border-purple-500/50 transition-all hover:-translate-y-1 duration-300 flex flex-col" 
                  key={idx}
                >
                  <div className="mb-4 border-b border-slate-700 pb-4">
                    <h3 className="text-2xl font-bold text-white mb-2">{recipe.name}</h3>
                    <span className="inline-block bg-purple-600/20 text-purple-300 text-xs font-bold px-3 py-1 rounded-full border border-purple-500/30">
                      ⏱ {recipe.cookingTime || "Time varies"}
                    </span>
                  </div>

                  <div className="mb-6">
                    <p className="text-slate-400 uppercase text-xs font-bold tracking-wider mb-2">Ingredients</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-300 text-sm">
                      {Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 ? (
                        recipe.ingredients.map((ing, i) => (
                          <li key={i} className="marker:text-purple-500">{ing}</li>
                        ))
                      ) : (
                        <li className="italic text-slate-500">Not available</li>
                      )}
                    </ul>
                  </div>

                  <div className="mt-auto">
                    <p className="text-slate-400 uppercase text-xs font-bold tracking-wider mb-2">Procedure</p>
                    <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 max-h-60 overflow-y-auto custom-scrollbar">
                      <ol className="list-decimal list-inside space-y-3 text-slate-300 text-sm">
                        {Array.isArray(recipe.procedure) && recipe.procedure.length > 0 ? (
                          recipe.procedure.map((step, i) => (
                            <li key={i} className="marker:text-indigo-400 pl-2 leading-relaxed">
                              {step}
                            </li>
                          ))
                        ) : (
                          <li className="italic text-slate-500">Not available</li>
                        )}
                      </ol>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center mt-20 p-8 bg-slate-900/50 border border-slate-800 rounded-2xl max-w-lg mx-auto">
              <p className="text-xl text-slate-400">
                No recipes found for this product yet. <br/>
                <span className="text-sm mt-2 block opacity-70">Try refreshing or check back later.</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Consume;