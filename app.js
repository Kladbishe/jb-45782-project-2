"use strict";
let tokens = [];




(async () => {

    const API_KEY = '1a2c8d09357737c35737275f39a842e96da059232b2d8263157a286df0b80c3f'
    const CACHE_AGE_IN_SECONDS = 5 //5 only


    const getData = async (url, apiKey) => {
        let data = localStorage.getItem(url)
        if (data) {
            data = JSON.parse(data)
            const { createdAt } = data
            console.log(new Date(createdAt).getTime() + CACHE_AGE_IN_SECONDS * 1000)
            console.log(new Date())
            if ((new Date(createdAt).getTime() + CACHE_AGE_IN_SECONDS * 1000) > new Date().getTime()) {
                console.log('cache hit')
                const parsed = JSON.parse(data.data);
                return Array.isArray(parsed) ? parsed : parsed.data;
            }
        }
        data = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } }).then(response => response.json())
        localStorage.setItem(url, JSON.stringify({ data: JSON.stringify(data), createdAt: new Date() }))
        console.log('cache miss')
        console.log(data)
        return data
    }
    try {
        tokens = await getData('https://rest.coincap.io/v3/assets', API_KEY)
        tokens = Array.isArray(tokens) ? tokens : tokens.data || [];
        console.log(tokens)

    } catch (e) {
        console.log(e)
    }
    setInterval(async () => {
        try {
            tokens = await getData('https://rest.coincap.io/v3/assets', API_KEY)
            tokens = Array.isArray(tokens) ? tokens : tokens.data || [];
            console.log("updated tokens", tokens);

            // drop to DOM:
            document.getElementById("tokensTOP").innerHTML = showTokerTOP(tokens, exchangeRate);
            restoreFavoritesFromLocalStorage();
            addStarListeners();
        } catch (e) {
            console.log(e);
        }
    }, 5000); // 5k



    const { conversion_rates: exchangeRate } = await fetch("https://v6.exchangerate-api.com/v6/b73290c1ccff103a22153184/latest/USD").then(r => r.json());



    const showTokerTOP = (tokens, exchangeRate) => {

        return tokens.map(({ id, name, rank, symbol, changePercent24Hr, priceUsd }) => {
            const usd = Number(priceUsd) || 0;
            console.log(`update Dom: ${name} — ${priceUsd}`);
            const change = Number(changePercent24Hr) || 0;
            return `
            
     <div id="${id}" class="token-card">
         <h4>
             <span>${rank}. ${name} (${symbol})</span>
             <span class="star" data-id="${id}">&#9733;</span>
         </h4><br><br>
         <h5>Price: ${usd.toFixed(2)} $</h5>
         <h5>Change: ${change.toFixed(2)}%</h5>

         <div class="dropdown dropdown-btn">
             <button class="btn btn-primary dropdown-toggle" type="button" id="dropdown-${(symbol || "").toLowerCase()}"
                     data-bs-toggle="dropdown" aria-expanded="false"></button>
             <ul class="dropdown-menu dropdown-menu-end p-3" aria-labelledby="dropdown-${(symbol || "").toLowerCase()}">
                 Price: ${(usd * (exchangeRate?.EUR || 0)).toFixed(2)} €<br>
                 Price: ${(usd * (exchangeRate?.ILS || 0)).toFixed(2)} ₪
             </ul>
         </div>
     </div>`;
        }).join("");
    };

    document.getElementById("tokensTOP").innerHTML = showTokerTOP(tokens, exchangeRate);


    const maxFavorites = 5;
    function saveFavoritesToLocalStorage() {
        const activeStars = document.querySelectorAll(".star.active");
        const favorites = Array.from(activeStars).map(star => star.dataset.id);
        localStorage.setItem("favoritesCoin", JSON.stringify(favorites));
    }
    function restoreFavoritesFromLocalStorage() {
        const favorites = JSON.parse(localStorage.getItem("favoritesCoin")) || [];
        document.querySelectorAll(".star").forEach(star => {
            if (favorites.includes(star.dataset.id)) {
                star.classList.add("active");
            }
        });
    }
    function addStarListeners() {
        const stars = document.querySelectorAll(".star");
        stars.forEach(star => {
            star.addEventListener("click", function () {
                const activeStars = document.querySelectorAll(".star.active");


                if (this.classList.contains("active")) {
                    this.classList.remove("active");
                    saveFavoritesToLocalStorage();
                    updateChart(); // update chart
                    return;
                }


                if (activeStars.length >= maxFavorites) {
                    showMaxCoinsModal(activeStars, this);
                    return;
                }


                this.classList.add("active");
                saveFavoritesToLocalStorage();
                updateChart(); // update 
            });
        });
    }


    addStarListeners();
    restoreFavoritesFromLocalStorage();


    /*
     * modal
     */
    const showMaxCoinsModal = (activeStars, pendingStar = null) => {
        const listContainer = document.getElementById("selectedCoinsList");
        listContainer.innerHTML = "";
        activeStars.forEach(star => {
            const li = document.createElement("li");
            li.className = "list-group-item d-flex justify-content-between align-items-center";
            li.textContent = star.dataset.id;
            const removeBtn = document.createElement("button");
            removeBtn.className = "btn btn-sm btn-danger";
            removeBtn.textContent = "delete";
            removeBtn.addEventListener("click", () => {
                star.classList.remove("active");
                saveFavoritesToLocalStorage();
                if (pendingStar && !pendingStar.classList.contains("active")) {
                    if (document.querySelectorAll(".star.active").length < maxFavorites) {
                        pendingStar.classList.add("active");
                        saveFavoritesToLocalStorage();
                    }
                }
                const modal = bootstrap.Modal.getInstance(document.getElementById("maxCoinsModal"));
                modal.hide();
            });
            li.appendChild(removeBtn);
            listContainer.appendChild(li);
        });
        const modal = new bootstrap.Modal(document.getElementById("maxCoinsModal"));
        modal.show();
    };




    /*
     * search
     */
    document.getElementById("search-token").addEventListener("input", (event) => {
        const q = event.target.value.trim().toUpperCase();

        const listToken = q === ""
            ? tokens
            : tokens.filter(({ symbol, name }) => {
                const s = (symbol || "").toUpperCase();
                const n = (name || "").toUpperCase();
                return s.includes(q) || n.includes(q);  
            });

        document.getElementById("tokensTOP").innerHTML += showTokerTOP(listToken, exchangeRate);
        restoreFavoritesFromLocalStorage();
        addStarListeners();
    });





    /*
     * chart
     */
    const ctx = document.getElementById("myChart").getContext("2d");
    const myChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: [], // data
            datasets: [] // coin
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    title: {
                        display: true,
                        text: "Price (USD)"
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: "Date"
                    }
                }
            }
        }
    });


    const chartDataMap = {};


    const getTimeLabel = () => {
        const now = new Date();
        return `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    };

    async function updateLiveChart() {
        const favorites = JSON.parse(localStorage.getItem("favoritesCoin")) || [];
        if (!favorites.length) return;

        const allTokens = await getData('https://rest.coincap.io/v3/assets', API_KEY);
        const time = getTimeLabel();

        for (const id of favorites) {
            try {
                const token = allTokens.find(t => t.id === id);
                const price = parseFloat(token?.priceUsd);
                if (isNaN(price)) continue;

                if (!chartDataMap[id]) chartDataMap[id] = [];
                chartDataMap[id].push({ time, price });

                if (chartDataMap[id].length > 30) {
                    chartDataMap[id].shift();
                }

            } catch (e) {
                alert(e)
            }
        }

        const datasets = [];
        const labels = chartDataMap[favorites[0]]?.map(p => p.time) || [];

        for (const id of favorites) {
            const color = `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;
            const data = chartDataMap[id]?.map(p => p.price) || [];

            datasets.push({
                label: id,
                data,
                borderColor: color,
                backgroundColor: color,
                fill: false,
                tension: 0.3
            });
        }

        myChart.data.labels = labels;
        myChart.data.datasets = datasets;
        myChart.update();
    }
    updateLiveChart()

    setInterval(updateLiveChart, 5000);//5k
//
})();
