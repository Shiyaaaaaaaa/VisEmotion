// Async function to load and parse data
async function fetchData() {
    const response = await fetch("http://localhost:8000/sentiment/emotion_result.json");
    const sentimentData = await response.json();

// Transform sentimentData to the needed format
var data = sentimentData.map(function(d) {
    if (d.time && d.result && d.result.sentiment && typeof d.result.sentiment === 'object') {
            var currentDate = new Date(d.time);
            var neg = d.result.sentiment.neg;
            var neu = d.result.sentiment.neu;
            var pos = d.result.sentiment.pos;
            var compound = d.result.sentiment.compound;
            var label = d.result.sentiment.label;

            return {
                "date": currentDate,
                "negative": neg, 
                "neutral": neu, 
                "positive": pos, 
                "intensity": Math.abs(compound),
                "compound": compound,
                "emotion": label
            };
        } else {
            console.error(`Invalid entry found. Date: ${d.time}, Sentiment: ${JSON.stringify(d.result ? d.result.sentiment : undefined)}`);
            return null;
        }
    }).filter(item => item !== null);

    return data;
}

async function drawChart(chartType) {
    // Remove the previous SVG if it exists
    d3.select("#streamChart").select("svg").remove();

    // Fetch and parse the data
    var data = await fetchData();

    // 
    var margin = {top: 60, right: 40, bottom: 40, left: 90},
                    width = 800 - margin.left - margin.right,
                    height = 400 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    var svg = d3.select("#streamChart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // Get the keys for the stacked data
    var keys = Object.keys(data[0]).slice(1, 4)// Get only 'neg', 'neu', 'pos'


    // Add X axis
    var x = d3.scaleTime()
        .domain(d3.extent(data, function(d) { return d.date; }))
        .range([ 0, width ]);
    
    svg.append("g")
        .attr("transform", "translate(0," + height*1.01 + ")")
        .call(d3.axisBottom(x).ticks(5).tickSize(0).tickPadding(10));

    
    // Y axis is not used, but keep the scale for the area and line generators
    var y = d3.scaleLinear()
        .domain([-1, 1])
        .range([height, 0]);
    
    // color palette
    var color = d3.scaleOrdinal()
        .domain(keys)
        .range(["blue", "green", "orange"]);  // "neg", "neu", "pos"

    //stack the data
    var stackedData;
        if (chartType === 'chart1') {
            stackedData = d3.stack()
            .keys(keys)
            .offset(d3.stackOffsetSilhouette) // 添加这一行
            (data);
            // Draw arrow for positive region (upward arrow)
                svg.append("line")
                .attr("x1", -50) // Adjust the x-position for positive arrow
                .attr("y1", y(1) + 75)
                .attr("x2", -50) // Adjust the x-position for positive arrow
                .attr("y2", y(0) + 75)
                .attr("stroke", "black");
                // Line at the top
                svg.append("line")
                .attr("x1", -50)
                .attr("y1", y(0) + 75)
                .attr("x2", -40) // Adjust the x-position for the short line
                .attr("y2", y(0) + 75)
                .attr("stroke", "black");

                // Line at the bottom
                svg.append("line")
                .attr("x1", -50)
                .attr("y1", y(1) + 75)
                .attr("x2", -40) // Adjust the x-position for the short line
                .attr("y2", y(1) + 75)
                .attr("stroke", "black");

                svg.append("text")
                .attr("x", -60) 
                .attr("y", y(0) - 100) // Adjust position for positive label
                .style("fill", "black")
                .style("font-family", "Merriweather")
                .text("Total Band Length");

                svg.append("text")
                .attr("x", -40)
                .attr("y", y(0) + 2) // Adjust position for negative label
                .style("fill", "black")
                .style("font-family", "Merriweather")
                .text("1");


        } else if (chartType === 'chart2') {
            stackedData = d3.stack()
            .keys(keys)
            .offset(d3.stackOffsetNone) // 添加这一行
            (data);
        stackedData.forEach(function(layer) {
                layer.forEach(function(segment) {
                        segment[0] *= segment.data.intensity;
                        segment[1] *= segment.data.intensity;
                    });
                });
        /*各种图例提示*/
        // Add labels for positive and negative regions
        svg.append("text")
            .attr("x", -50)
            .attr("y", y(0) - 160) // Adjust position for positive label
            .style("fill", "black")
            .style("font-family", "Merriweather")
            .text("1");

        svg.append("text")
            .attr("x", -50)
            .attr("y", y(0) + 170) // Adjust position for negative label
            .style("fill", "black")
            .text("-1");
                
        svg.append("text")
            .attr("x", -40)
            .attr("y", y(0) + 2) // Adjust position for negative label
            .style("fill", "black")
            .style("font-family", "Merriweather")
            .text("0");
                    

        // Draw arrow for positive region (upward arrow)
        svg.append("line")
            .attr("x1", -50) // Adjust the x-position for positive arrow
            .attr("y1", y(1))
            .attr("x2", -50) // Adjust the x-position for positive arrow
            .attr("y2", y(0))
            .attr("stroke", "black");

        svg.append("polygon")
            .attr("points", "-55," + (y(1) + 10) + " -45," + (y(1) + 10) + " -50," + y(1))
            .attr("fill", "black");

        // Draw arrow for negative region (downward arrow)
        svg.append("line")
            .attr("x1", -50) // Adjust the x-position for negative arrow
            .attr("y1", y(0))
            .attr("x2", -50) // Adjust the x-position for negative arrow
            .attr("y2", y(-1))
            .attr("stroke", "black");

        svg.append("polygon")
            .attr("points", "-55," + (y(-1) - 10) + " -45," + (y(-1) - 10) + " -50," + y(-1))
            .attr("fill", "black");

        // Calculate the position and length of the positive line
        var positiveLineStartX = width + 20; // Move the starting X coordinate to the left by 20
        var positiveLineEndX = width + 20; // Move the ending X coordinate to the left by 20
        var lineLength = height * (1 / 3); // Calculate the line length as two-thirds of the chart height

        // Add the positive line (vertical line)
        var positiveLine = svg.append("line")
            .attr("x1", positiveLineStartX)
            .attr("y1", 0) // Adjust the starting Y coordinate to move it down
            .attr("x2", positiveLineEndX)
            .attr("y2", lineLength) // Adjust the ending Y coordinate to the bottom of the chart
            .attr("stroke", "black")
            .attr("stroke-width", 2)
            .on("mouseover", function () {
                tooltip.style("opacity", .8)
                    .html("The wider the color river band, <br> the higher the probability of this category.")
                    .style("left", (d3.event.pageX + 10) + "px")
                    .style("top", (d3.event.pageY + 10) + "px");
            })
            .on("mouseout", function () {
                tooltip.style("opacity", 0);
            });

        // Add short lines at both ends of the positive line
        var shortLineLength = 10;
        svg.append("line")
            .attr("x1", positiveLineStartX - shortLineLength) // Adjust X coordinate to the left of the line
            .attr("y1", 0)
            .attr("x2", positiveLineStartX)
            .attr("y2", 0)
            .attr("stroke", "black")
            .attr("stroke-width", 2);

        svg.append("line")
            .attr("x1", positiveLineStartX - shortLineLength) // Adjust X coordinate to the left of the line
            .attr("y1", lineLength)
            .attr("x2", positiveLineStartX)
            .attr("y2", lineLength)
            .attr("stroke", "black")
            .attr("stroke-width", 2);  
                }

    // Area generator
    var area = d3.area()
        .curve(d3.curveBasis) // Add this line to apply curve to the area
        .x(function(d) { return x(d.data.date); })
        .y0(function(d) { return y(d[0]); })
        .y1(function(d) { return y(d[1]); });

    // Show the areas
    var areas = svg
        .selectAll("mylayers")
        .data(stackedData)
        .enter()
        .append("path")
        .attr("class", "myArea")
        .style("fill", function (d) { return color(d.key); })
        .attr("d", area);

    var highlight = function (d) {
        areas.style("opacity", .1)
        areas.filter(function (e) { return e.key === d; })
            .style("opacity", 1)
        }

        var noHighlight = function (d) {
            areas.style("opacity", .8)
        }

    // Create legend
    var legendWidth = 100;  // Adjust this to match the actual width of your legend items
    var legendSpacing = 20;  // Adjust this to increase/decrease spacing between legend items
    var totalWidth = color.domain().length * (legendWidth + legendSpacing) - legendSpacing;
    var startx = (width - totalWidth) / 2;
                    
    
    var legend = svg.selectAll(".legend")
        .data(color.domain())
        .enter().append("g")
        .attr("class", "legend")
        // Modify here for position adjustment
        .attr("transform", function(d, i) { return "translate(" + (startx + i * (legendWidth + legendSpacing)) + ",-50)"; })

        .on("mouseover", function(d) {
            highlight(d);
        })
        .on("mouseout", noHighlight);
    

    // Draw legend rectangles
    legend.append("rect")
        .attr("x", -legendWidth / 2)
        .attr("width", legendWidth)
        .attr("height", 18)
        .style("fill", color);
    
    // Draw legend text
    legend.append("text")
        .attr("x", -legendWidth / 2)
        .attr("y", 18+12)  // Add 4 as a little offset
        .attr("dy", ".35em")
        .style("text-anchor", "start")
        .style("fill", "black")  // Change text color to black
        .text(function(d) { return d; });
    
    // Add a vertical line
    // 计算垂直hover线的长度
    var lineLength = height - y(d3.max(stackedData, function(layer) {
        return d3.max(layer, function(d) { return d[1]; });
    }));
    
    var verticalLine = svg.append('line')
        .attr('stroke', 'black')
        .attr('y1', 0)
        .attr('y2', lineLength);
                    
    

    // Define the div for the tooltip
    var tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // 创建一个自定义事件
    //var dateChangeEvent = new Event('dateChange');

    // Create a overlay rectangle to capture mouse
    svg.append('rect')
    .attr('width', width)
    .attr('height', height * 0.8)
    .attr('opacity', 0)
    .on('mouseover', function () {
        verticalLine.attr('opacity', 1);
        tooltip.style("opacity", .8);

    // 创建一个自定义事件
    var dateChangeEvent = new CustomEvent('dateChange', {
        detail: {
            date: window.selectedDate
        }
    });

    // 触发自定义事件
    document.dispatchEvent(dateChangeEvent);
        })
        .on('mouseout', function () {
            verticalLine.attr('opacity', 0);
            tooltip.style("opacity", 0);
        })
        .on('mousemove', function () {
            var x0 = x.invert(d3.mouse(this)[0]);
            var i = d3.bisector(function (d) { return d.date; }).left(data, x0, 1);
            var d0 = data[i - 1];
            var d1 = data[i];
            var d = x0 - d0.date > d1.date - x0 ? d1 : d0;

        // 更新全局变量，使用 toISOString 方法来格式化日期
        window.selectedDate = d.date;
        localStorage.setItem('selectedDate', window.selectedDate.toISOString());

        // 更新显示元素为字符串
        var displayElement = document.getElementById('selectedDateDisplay');
        displayElement.textContent = 'Red Radar ' + window.selectedDate.toISOString().split('T')[0];

        // 获取iframe元素
        var iframe = document.querySelector('#radarChart iframe');

        // 检查iframe是否存在并且具有contentWindow属性
        if (iframe && iframe.contentWindow) {
            var message = {
                type: 'dateChange',
                date: window.selectedDate.toISOString() // 使用toISOString()将日期转换为字符串
            };
            iframe.contentWindow.postMessage(message, '*'); // 发送消息到iframe
        }


        // Position and show the line
        verticalLine.attr('x1', x(d.date)).attr('x2', x(d.date));

        // Update the tooltip
        tooltip.html(d.date.toISOString().substring(0, 10) + "<br/>"
            + "Emotion: " + d.emotion + "<br/>"
            + "Positive Probability: " + d.positive.toFixed(2) + "<br/>"
            + "Neutral Probability: " + d.neutral.toFixed(2) + "<br/>"
            + "Negative Probability: " + d.negative.toFixed(2) + "<br/>"
            + "Intensity (Magnitude of Compound): " + d.intensity + "<br/>"
            + "Compound Scores: " + d.compound + "<br/>")
            .style("left", (d3.event.pageX + 10) + "px")
            .style("top", (d3.event.pageY + 10) + "px");

        // Update the global variable
        window.selectedDate = d.date;
    });


    }
    
    //默认加载chart 1 
    window.onload = function() {
        drawChart('chart2');
    };
