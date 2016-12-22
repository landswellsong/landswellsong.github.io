var tocmenu = document.createElement("div");
tocmenu.setAttribute("class", "tocpanel");
var toclist = document.getElementById("markdown-toc");
toclist.setAttribute("class", "toctopics");
tocmenu.appendChild(toclist);
var contentdiv = document.getElementsByClassName("wrap")[0];
contentdiv.parentNode.appendChild(tocmenu, contentdiv);
