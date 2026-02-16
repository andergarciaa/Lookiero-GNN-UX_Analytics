// ================= CONFIGURACIÓN GLOBAL =================
const margin = {top: 40, right: 30, bottom: 90, left: 70}; 
const width = 500 - margin.left - margin.right;
const height = 350 - margin.top - margin.bottom;

const PALETTE = {
    coral: "#D17A74",
    coralLight: "#E8B7B3",
    teal: "#4FB097",
    tealLight: "#A3D9CC",
    dark: "#1A1A1A",
    gray: "#F0F0F0"
};

const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("background-color", "rgba(26, 26, 26, 0.95)")
    .style("color", "white")
    .style("padding", "10px 14px")
    .style("border-radius", "6px")
    .style("font-family", "Montserrat, sans-serif")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("z-index", "1000")
    .style("box-shadow", "0 4px 12px rgba(0,0,0,0.15)")
    .style("transition", "opacity 0.1s");

// ================= CARGA DE DATOS =================
Promise.all([
    // Ruta hacia la carpeta "Datos look&like"
    d3.csv("Datos/Originales/Datos look&like/items_data.csv"), 
    d3.dsv(";", "Datos/Originales/Datos look&like/customers_data_2.csv"),
    d3.dsv(";", "Datos/Originales/Datos look&like/look_and_like_data_2.csv"),
    
    // Ruta hacia la carpeta "Datos looks"
    d3.csv("Datos/Originales/Datos looks/brand.csv"),
    d3.csv("Datos/Originales/Datos looks/color.csv")
]).then(([items, customers, likes, brands, colors]) => {
    
    // Gráficos Cliente
    renderMarketChart(customers);       
    renderStylesProChart(customers);    
    renderJobsDonutChart(customers);  

    // Gráficos Inventario
    renderFamilyChart(items);         
    renderBrandOriginChart(brands);
    renderRealColorsChart(items, colors);
    
    // --- GRÁFICO NUEVO (POR CATEGORÍAS) ---
    renderPriceCategoriesChart(items); 

    // Gráficos Interacción
    renderEngagementChart(likes);

}).catch(err => console.error("Error cargando datos:", err));


// ================= HELPERS =================
function createSVG(selector) {
    d3.select(selector).html("");
    return d3.select(selector).append("svg")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);
}

function styleAxes(svg, xAxis, yAxis, xLabel, yLabel, rotateX = false) {
    svg.selectAll(".domain").style("stroke", "#ddd").style("stroke-width", "1px");
    svg.selectAll(".tick line").style("stroke", "#f9f9f9");
    svg.selectAll(".tick text").style("fill", "#666").style("font-family", "Montserrat").style("font-size", "11px");

    if (rotateX) {
        svg.select(".x-axis").selectAll("text")
            .style("text-anchor", "end").attr("dx", "-0.8em").attr("dy", "0.15em").attr("transform", "rotate(-45)");
    }

    if (xLabel) {
        svg.append("text").attr("transform", `translate(${width/2}, ${height + margin.bottom - 20})`)
            .style("text-anchor", "middle").style("font-family", "Playfair Display").style("font-size", "13px")
            .style("font-weight", "bold").style("fill", "#333").text(xLabel);
    }

    if (yLabel) {
        svg.append("text").attr("transform", "rotate(-90)").attr("y", 0 - margin.left + 15).attr("x", 0 - (height / 2))
            .attr("dy", "1em").style("text-anchor", "middle").style("font-family", "Playfair Display").style("font-size", "13px")
            .style("font-weight", "bold").style("fill", "#333").text(yLabel);
    }
}

// ================= GRÁFICOS =================

// 1. PRECIOS POR CATEGORÍAS (NUEVO DISEÑO SÓLIDO)
function renderPriceCategoriesChart(data) {
    // Definimos rangos de negocio
    const ranges = [
        { label: "< 30€", min: 0, max: 30, count: 0 },
        { label: "30€ - 60€", min: 30, max: 60, count: 0 },
        { label: "60€ - 90€", min: 60, max: 90, count: 0 },
        { label: "90€ - 120€", min: 90, max: 120, count: 0 },
        { label: "> 120€", min: 120, max: 9999, count: 0 }
    ];

    // Clasificamos los datos
    data.forEach(d => {
        const price = +d.current_price_eur / 100;
        const bucket = ranges.find(r => price >= r.min && price < r.max);
        if (bucket) bucket.count++;
    });

    const svg = createSVG("#chart_prices");

    // Escalas
    const x = d3.scaleBand()
        .domain(ranges.map(d => d.label))
        .range([0, width])
        .padding(0.3); // Espacio entre barras

    const y = d3.scaleLinear()
        .domain([0, d3.max(ranges, d => d.count)])
        .range([height, 0]);

    // Ejes
    const xAxis = svg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));
    const yAxis = svg.append("g").call(d3.axisLeft(y).ticks(5));

    styleAxes(svg, xAxis, yAxis, "Rango de Precio", "Cantidad de Prendas");

    // Barras
    svg.selectAll("rect")
        .data(ranges)
        .enter()
        .append("rect")
            .attr("x", d => x(d.label))
            .attr("width", x.bandwidth())
            .attr("y", height) // Inicio animación (suelo)
            .attr("height", 0)
            .style("fill", PALETTE.coral)
            .style("rx", 4) // Bordes redondeados
            // Animación de crecimiento
            .transition().duration(800).delay((d, i) => i * 100).ease(d3.easeCubicOut)
            .attr("y", d => y(d.count))
            .attr("height", d => height - y(d.count));

    // Interactividad
    svg.selectAll("rect")
        .on("mouseover", function(event, d) {
            d3.select(this).style("fill", "#D17A74");
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`<strong>${d.label}</strong><br/>${d.count} prendas`)
                .style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).style("fill", PALETTE.coral);
            tooltip.transition().duration(500).style("opacity", 0);
        });
}

// 2. ORIGEN MARCAS
function renderBrandOriginChart(data) {
    const counts = d3.rollups(data, v => v.length, d => d.origin).sort((a,b) => b[1] - a[1]);
    const labelMap = {"NO_MAINSTREAM": "Indie/Nicho", "WHOLE_SALE": "Mayorista", "MAINSTREAM": "Mainstream", "OWN_PRODUCTION": "Propia"};

    const svg = createSVG("#chart_brands");
    const x = d3.scaleBand().domain(counts.map(d => d[0])).range([0, width]).padding(0.4);
    const y = d3.scaleLinear().domain([0, d3.max(counts, d => d[1])]).range([height, 0]);
    
    const xAxis = svg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d => labelMap[d] || d));
    const yAxis = svg.append("g").call(d3.axisLeft(y).ticks(5));

    styleAxes(svg, xAxis, yAxis, "Tipo de Origen", "Nº Marcas", true);

    svg.selectAll("rect").data(counts).enter().append("rect")
        .attr("x", d => x(d[0])).attr("y", height).attr("width", x.bandwidth()).attr("height", 0)
        .style("fill", PALETTE.coral).attr("rx", 3)
        .transition().duration(800).delay((d, i) => i * 100).ease(d3.easeCubicOut)
        .attr("y", d => y(d[1])).attr("height", d => height - y(d[1]));

    svg.selectAll("rect").on("mouseover", function(event, d) {
        d3.select(this).style("opacity", 0.7);
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`<strong>${labelMap[d[0]]||d[0]}</strong><br/>${d[1]} marcas`)
            .style("left", (event.pageX+10)+"px").style("top", (event.pageY-28)+"px");
    }).on("mouseout", function() {
        d3.select(this).style("opacity", 1);
        tooltip.transition().duration(500).style("opacity", 0);
    });
}

// 3. COLORES REALES
function renderRealColorsChart(itemsData, colorsData) {
    const colorMap = new Map();
    colorsData.forEach(c => colorMap.set(c.name, "#" + c.hexadecimal));
    const counts = d3.rollups(itemsData, v => v.length, d => d.color).sort((a,b) => b[1] - a[1]).slice(0, 10);

    const svg = createSVG("#chart_colors");
    const x = d3.scaleBand().domain(counts.map(d => d[0])).range([0, width]).padding(0.25);
    const y = d3.scaleLinear().domain([0, d3.max(counts, d => d[1])]).range([height, 0]);

    const xAxis = svg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
    const yAxis = svg.append("g").call(d3.axisLeft(y).ticks(5));

    styleAxes(svg, xAxis, yAxis, "Color", "Unidades", true);

    svg.selectAll("rect").data(counts).enter().append("rect")
        .attr("x", d => x(d[0])).attr("y", height).attr("width", x.bandwidth()).attr("height", 0)
        .attr("fill", d => colorMap.get(d[0]) || "#ccc").attr("stroke", "#ddd").attr("stroke-width", "1px")
        .transition().duration(800).delay((d,i)=>i*50)
        .attr("y", d => y(d[1])).attr("height", d => height - y(d[1]));

    svg.selectAll("rect").on("mouseover", function(event, d) {
        d3.select(this).attr("stroke", "#333");
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`<strong>${d[0]}</strong><br/>${d[1]}`).style("left", (event.pageX+10)+"px").style("top", (event.pageY-28)+"px");
    }).on("mouseout", function() {
        d3.select(this).attr("stroke", "#ddd");
        tooltip.transition().duration(500).style("opacity", 0);
    });
}

// 4. ENGAGEMENT
function renderEngagementChart(data) {
    const counts = d3.rollups(data, v => v.length, d => d.response);
    const svg = d3.select("#chart_engagement").html("").append("svg")
        .attr("viewBox", `0 0 ${width + margin.left} ${height + margin.top}`)
        .append("g").attr("transform", `translate(${(width+margin.left)/2}, ${(height+margin.top)/2})`);

    const radius = Math.min(width, height) / 2.2;
    const color = d3.scaleOrdinal().domain(["True", "False"]).range([PALETTE.teal, PALETTE.coral]);
    const pie = d3.pie().value(d => d[1]).sort(null);
    const arc = d3.arc().innerRadius(radius * 0.6).outerRadius(radius * 0.9);
    const arcHover = d3.arc().innerRadius(radius * 0.6).outerRadius(radius * 1.0);

    const arcs = svg.selectAll("arc").data(pie(counts)).enter().append("g");
    
    arcs.append("path")
        .attr("fill", d => color(d.data[0])).attr("stroke", "white").style("stroke-width", "3px")
        .transition().duration(1000).attrTween("d", function(d) {
            const i = d3.interpolate(d.startAngle+0.1, d.endAngle);
            return function(t) { d.endAngle = i(t); return arc(d); }
        });

    setTimeout(() => {
        svg.selectAll("path").on("mouseover", function(event, d) {
            d3.select(this).transition().duration(200).attr("d", arcHover);
            const label = (d.data[0] == "True" || d.data[0] === true) ? "Likes" : "Dislikes";
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`<strong>${label}</strong><br/>${d.data[1]}`)
                .style("left", (event.pageX+10)+"px").style("top", (event.pageY-28)+"px");
        }).on("mouseout", function() {
            d3.select(this).transition().duration(200).attr("d", arc);
            tooltip.transition().duration(500).style("opacity", 0);
        });
    }, 1000);

    const total = d3.sum(counts, d => d[1]);
    const likes = counts.find(d => String(d[0]) === "True")?.[1] || 0;
    const percent = total > 0 ? ((likes / total) * 100).toFixed(1) : 0;

    svg.append("text").attr("text-anchor", "middle").attr("dy", "0.3em").style("font-family", "Playfair Display").style("font-size", "36px").style("font-weight", "bold").style("fill", PALETTE.teal).text(percent + "%");
    svg.append("text").attr("text-anchor", "middle").attr("dy", "2.5em").style("font-family", "Montserrat").style("font-size", "10px").text("MATCH RATE");
}

// 5. MERCADOS
function renderMarketChart(data) {
    const counts = d3.rollups(data, v => v.length, d => d.user_market).sort((a,b) => b[1] - a[1]);
    const svg = createSVG("#chart_market");
    const x = d3.scaleBand().domain(counts.map(d => d[0])).range([0, width]).padding(0.3);
    const y = d3.scaleLinear().domain([0, d3.max(counts, d => d[1])]).range([height, 0]);
    
    const xAxis = svg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
    const yAxis = svg.append("g").call(d3.axisLeft(y).ticks(5));
    styleAxes(svg, xAxis, yAxis, "Mercado", "Nº Usuarios");

    svg.selectAll("rect").data(counts).enter().append("rect")
        .attr("x", d => x(d[0])).attr("y", height).attr("width", x.bandwidth()).attr("height", 0)
        .attr("fill", PALETTE.coral).attr("rx", 3)
        .transition().duration(800).delay((d,i)=>i*100)
        .attr("y", d => y(d[1])).attr("height", d => height - y(d[1]));

    svg.selectAll("rect").on("mouseover", function(event, d) {
        d3.select(this).style("opacity", 0.7);
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`<strong>${d[0]}</strong><br/>${d[1]}`).style("left", (event.pageX+10)+"px").style("top", (event.pageY-28)+"px");
    }).on("mouseout", function() {
        d3.select(this).style("opacity", 1);
        tooltip.transition().duration(500).style("opacity", 0);
    });
}

// 6. ESTILOS
function renderStylesProChart(data) {
    const counts = d3.rollups(data, v => v.length, d => d.style_1).filter(d => d[0]).sort((a,b) => b[1] - a[1]).slice(0, 7);
    const svg = createSVG("#chart_styles_pro");
    const y = d3.scaleBand().domain(counts.map(d => d[0])).range([0, height]).padding(0.2);
    const x = d3.scaleLinear().domain([0, d3.max(counts, d => d[1])]).range([0, width]);
    
    const yAxis = svg.append("g").call(d3.axisLeft(y));
    const xAxis = svg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(5));
    styleAxes(svg, xAxis, yAxis, "Nº Usuarias", "");

    svg.selectAll("rect").data(counts).enter().append("rect")
        .attr("x", 0).attr("y", d => y(d[0])).attr("width", 0).attr("height", y.bandwidth())
        .attr("fill", PALETTE.coral).attr("rx", 3)
        .transition().duration(800).delay((d,i)=>i*50)
        .attr("width", d => x(d[1]));

    svg.selectAll("rect").on("mouseover", function(event, d) {
        d3.select(this).attr("fill", PALETTE.coralLight);
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`<strong>${d[0]}</strong><br/>${d[1]}`).style("left", (event.pageX+10)+"px").style("top", (event.pageY-28)+"px");
    }).on("mouseout", function() {
        d3.select(this).attr("fill", PALETTE.coral);
        tooltip.transition().duration(500).style("opacity", 0);
    });
}

// 7. FAMILIA
function renderFamilyChart(data) {
    const counts = d3.rollups(data, v => v.length, d => d.family).sort((a,b) => b[1] - a[1]).slice(0, 8);
    const svg = createSVG("#chart_family");
    const y = d3.scaleBand().domain(counts.map(d => d[0])).range([0, height]).padding(0.2);
    const x = d3.scaleLinear().domain([0, d3.max(counts, d => d[1])]).range([0, width]);
    const yAxis = svg.append("g").call(d3.axisLeft(y));
    const xAxis = svg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(5));
    styleAxes(svg, xAxis, yAxis, "Volumen Stock", "");

    svg.selectAll("rect").data(counts).enter().append("rect")
        .attr("x", 0).attr("y", d => y(d[0])).attr("width", 0).attr("height", y.bandwidth())
        .attr("fill", PALETTE.coral).attr("rx", 3)
        .transition().duration(800).delay((d,i)=>i*50)
        .attr("width", d => x(d[1]));

    svg.selectAll("rect").on("mouseover", function(event, d) {
        d3.select(this).style("opacity", 0.7);
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`<strong>${d[0]}</strong><br/>${d[1]}`).style("left", (event.pageX+10)+"px").style("top", (event.pageY-28)+"px");
    }).on("mouseout", function() {
        d3.select(this).style("opacity", 1);
        tooltip.transition().duration(500).style("opacity", 0);
    });
}

// 8. PROFESIONES
function renderJobsDonutChart(data) {
    const counts = d3.rollups(data, v => v.length, d => d.job).filter(d => d[0]).sort((a,b) => b[1] - a[1]).slice(0, 5); 
    const svg = d3.select("#chart_jobs").html("").append("svg")
        .attr("viewBox", `0 0 ${width + margin.left} ${height + margin.top}`)
        .append("g").attr("transform", `translate(${(width+margin.left)/2}, ${(height+margin.top)/2})`);

    const radius = Math.min(width, height) / 2.2;
    const color = d3.scaleOrdinal().range([PALETTE.coral, "#E08E89", "#E8A5A1", "#F0BCB9", "#F7D3D1"]);
    const pie = d3.pie().value(d => d[1]);
    const arc = d3.arc().innerRadius(radius * 0.6).outerRadius(radius * 0.9);
    
    const arcs = svg.selectAll("arc").data(pie(counts)).enter().append("g");
    arcs.append("path").attr("fill", d => color(d.data[0])).attr("stroke", "white").style("stroke-width", "3px")
        .transition().duration(1000).attrTween("d", function(d) {
            const i = d3.interpolate(d.startAngle+0.1, d.endAngle);
            return function(t) { d.endAngle = i(t); return arc(d); }
        })
        .attr("d", arc);

    setTimeout(() => {
        svg.selectAll("path").on("mouseover", function(event, d) {
            d3.select(this).style("opacity", 0.8);
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`<strong>${d.data[0]}</strong><br/>${d.data[1]}`).style("left", (event.pageX+10)+"px").style("top", (event.pageY-28)+"px");
        }).on("mouseout", function() {
            d3.select(this).style("opacity", 1);
            tooltip.transition().duration(500).style("opacity", 0);
        });
    }, 1000);

    svg.append("text").attr("text-anchor", "middle").attr("dy", "0.3em").style("font-weight", "bold").style("fill", "#666").text("TOP 5");
}