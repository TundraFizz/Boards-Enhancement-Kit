$(document).ready(function(){
  $("span").click(function(){
    chrome.tabs.create({url: "https://boards.na.leagueoflegends.com/en/c/general-discussion"});
  });
});
