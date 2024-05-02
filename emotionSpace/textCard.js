// textCard.js
function addTextCard(text) {
    window.app.cards.push({ text: text });
}

// 将函数暴露给全局作用域，以便在其他文件中使用
window.addTextCard = addTextCard;

// 页面加载时自动添加卡片
addTextCard("This is a test card.");

