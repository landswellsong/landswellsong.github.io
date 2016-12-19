// TODO: replace with native Jekyll means

HTMLCollection.prototype.forEach = Array.prototype.forEach;
NodeList.prototype.forEach = Array.prototype.forEach;

var i = 1;

var tocmenu = document.createElement("div");
tocmenu.setAttribute("class", "tocpanel");
var toclist = document.createElement("ul");
toclist.setAttribute("class", "toctopics");
tocmenu.appendChild(toclist);


document.getElementsByTagName("h2").forEach(function(elt){
  var anchor = document.createElement("a");
  anchor.setAttribute("name", i);
  elt.parentNode.insertBefore(anchor, elt);
  var tocitem = document.createElement("li");
  var toclink = document.createElement("a");
  toclink.setAttribute("href", "#" + i);
  toclink.innerHTML = elt.innerHTML;
  tocitem.appendChild(toclink);
  toclist.appendChild(tocitem);
  ++i;
})

var contentdiv = document.getElementsByClassName("wrap")[0];
contentdiv.parentNode.appendChild(tocmenu, contentdiv);
