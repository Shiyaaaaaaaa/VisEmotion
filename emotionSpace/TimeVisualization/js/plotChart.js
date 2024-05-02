// Load the data
d3.json("http://localhost:8000/sentiment/emotion_result.json", function(error, sentimentData) {
    if (error) throw error;

    var data = sentimentData.map(function(d) {
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
            "emotion":label
        };
    });

    // 定义新的信息显示元素
    var infoDisplay = d3.select("#infoDisplay");

    var svg = d3.select("#chartContainer")
        .append("svg")
        .attr("width", 800)
        .attr("height", 500);

    var margin = {top: 100, right: 100, bottom: 50, left: 100},
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom;

    var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var x = d3.scaleTime()
        .rangeRound([0, width]);

    var y = d3.scaleLinear()
        .rangeRound([height, 0]);

    var z = d3.scaleOrdinal()
        .domain(["positive", "neutral", "negative"])
        .range(["orange", "green", "blue"]);

    var line = d3.line()
        .x(function(d) { return x(d.date); })
        .y(function(d) { return y(d.compound); });

    x.domain(d3.extent(data, function(d) { return d.date; }));
    y.domain([-1.1, 1.1 * d3.max(data, function(d) { return d.compound; })]); // Expanded y-axis domain to include 1.

    g.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))
        .append("text")
        .attr("fill", "#000")
        .attr("y", 0) // Adjusted position to avoid overlap with x-axis.
        .attr("x", width + 50)
        .attr("font-weight", "bold")
        .attr("text-anchor", "end")
        .text("Date");

    g.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(y))
        .append("text")
        .attr("fill", "#000")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20) // 调整y值使标签距离Y轴更远一些
        .attr("dy", "1em") // 调整dy值来控制标签的垂直位置
        .attr("x", -height / 2)
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .text("Compound Score");
    

    // 添加y = 0的线
    g.append("line")
        .attr("x1", 0)
        .attr("y1", y(0)) // y = 0
        .attr("x2", width)
        .attr("y2", y(0)) // y = 0
        .attr("stroke", "black")
        .attr("stroke-width", 3)
        .style("opacity", 1); // 设置不透明度以使线可见

    // 在 y = 0.05 处添加虚线
g.append("line")
.attr("x1", 0)
.attr("y1", y(0.05))
.attr("x2", width)
.attr("y2", y(0.05))
.attr("stroke", "orange")
.attr("stroke-width", 2)
.attr("stroke-dasharray", "5,5"); // 通过这个属性设置虚线

// 在 y = -0.05 处添加虚线
g.append("line")
.attr("x1", 0)
.attr("y1", y(-0.05))
.attr("x2", width)
.attr("y2", y(-0.05))
.attr("stroke", "blue")
.attr("stroke-width", 2)
.attr("stroke-dasharray", "5,5"); // 通过这个属性设置虚线


    var thresholdLine = g.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .style("opacity", 0);

    g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-width", 1.5)
        .attr("d", line);

    var dot = g.selectAll(".dot")
        .data(data)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", function(d) { return x(d.date) })
        .attr("cy", function(d) { return y(d.compound) })
        .attr("r", 5)
        .style("fill", function(d) { return z(d.emotion); })
        .on("mouseover", function(d) {
            d3.select(this).attr("r", 8).style("stroke", "red");
            // 获取当前点的坐标
            var xPosition = x(d.date);
            var yPosition = y(d.compound);
            // 将信息框定位在点的旁边
            infoDisplay
                .style("display", "block")
                .style("left", (margin.left + xPosition + window.scrollX - 50) + "px") // 将tooltip定位到点的右侧，并考虑滚动条
                .style("top", (margin.top + yPosition + window.scrollY + 60) + "px") // 设置tooltip显示在点的旁边，并考虑滚动条的影响
                .html("Time: " + d.date.toISOString().slice(0, 10) + "<br/>" +
                        "Emotion: " + d.emotion + "<br/>" + 
                        "Compound: " + d.compound);
        })
        
        .on("mouseout", function(d) {        
            d3.select(this).attr("r", 5)
            .style("stroke", "none");  // Reset the dot size and remove the red stroke  
            // 隐藏infoDisplay
            infoDisplay.style("display", "none"); 
        })
        
        .on("click", function(d) {
            // 获取iframe元素
            var iframe = document.querySelector('#wordCloud iframe');
        
            // 检查iframe是否存在并且具有contentWindow属性
            if (iframe && iframe.contentWindow) {
                var message = {
                    type: 'dateChange',
                    date: d.date.toISOString().split('T')[0] // 使用toISOString()将日期转换为字符串
                };
                iframe.contentWindow.postMessage(message, '*'); // 发送消息到iframe
            }
        });
        

        var legend = g.selectAll(".legend")
        .data(z.domain())
        .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(0," + (i * 30 - 15) + ")"; });


        /*两个类别交互逻辑：图例上的hover是针对所有的点，会使categories归0 */
        /*类别旋转和阈值过滤器：和逻辑*/
        legend.append("circle")
            .attr("cx", width + 50)
            .attr("cy", -60)
            .attr("r", 10)
            .style("fill", z)
            .on("mouseover", function (d) {
                // Reset the select value
                d3.select("#emotionSelect").property("value", "all");
                // Highlight the dots based on the legend
                dot.style("opacity", .1)
                    .filter(function (dot_d) { return dot_d.emotion == d; })
                    .style("opacity", 1);
            })
            .on("mouseout", function (d) {
                // Reset the dot opacity
                dot.style("opacity", 1);
            });


        legend.append("text")
            .attr("x", width + 30)
            .attr("y", -60) //减小上移
            .attr("dy", ".35em")
            .attr("class", "legend-text") // 添加一个class
            .style("text-anchor", "end")
            .text(function(d) { 
                // 添加额外的说明信息
                var extraDescription = d === 'positive' ? ' (compound score >=  0.05)' : d === 'neutral' ? ' (-0.05 < compound score < 0.05)' : d === 'negative' ? ' (compound score < = -0.05)' : ' emotion';
                return d + extraDescription; // 返回的文本
            });

function applyFilters() {
    var selectedEmotion = d3.select("#emotionSelect").property("value");
    var selectedIntensity = d3.select("#intensityInput").property("value");

    // 初始化所有点的透明度为0.1
    dot.style("opacity", .1);

    // 如果选择的情感为 "all"，则将所有点的透明度设置为1
    if (selectedEmotion === "all") {
        dot.style("opacity", 1);
    } else {
        // 如果选择了特定情感，则根据选择的情感设置透明度
        dot.filter(function (d) { return d.emotion === selectedEmotion; })
           .style("opacity", 1);
    }

    // 如果输入了强度，则进一步根据强度设置透明度
    if (selectedIntensity !== "") {
        selectedIntensity = parseFloat(selectedIntensity);
        thresholdLine.attr("y1", y(selectedIntensity))
            .attr("y2", y(selectedIntensity))
            .style("opacity", 1);

        dot.style("opacity", function(d) {
                if (selectedIntensity > 0 && d.compound < selectedIntensity) return 0.1;
                if (selectedIntensity < 0 && d.compound > selectedIntensity) return 0.1;
                return d3.select(this).style("opacity");
            });
    } else {
        thresholdLine.style("opacity", 0);
    }
}

d3.select("#emotionSelect").on("change", applyFilters); // 当情感选择发生更改时，调用applyFilters函数
d3.select("#intensityInput").on("input", applyFilters); // 当强度输入发生更改时，调用applyFilters函数

})