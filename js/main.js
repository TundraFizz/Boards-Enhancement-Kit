var domain = "https://tundrafizz.space";  // The domain of course
// var domain = "https://fizzic.al";      // The domain of course
var Get    = chrome.storage.local.get;    // Alias for getting data
var Set    = chrome.storage.local.set;    // Alias for setting data
var Remove = chrome.storage.local.remove; // Alias for removing data
var Clear  = chrome.storage.local.clear;  // Alias for clearing data

// This is used in the SendToServer function
function cab(){/* CreateAlertBox("14px","#990000","#DD0000","#FFFFFF",`Unable to connect to the BEK server, <a href="https://twitter.com/Tundra_Fizz" target="_blank">try checking Twitter</a> for possible status updates.`); */}

// Minimized function I made which helps sending form POST data easily
function SendToServer(u,f,c){$.ajax({url:u,type:"POST",data:f,contentType:false,processData:false}).done(function(d){c(d);}).fail(function(err, two){cab();});}

// LoadCSS: Loads a CSS file (for testing on development versions only)
function LoadCSS(url){var head = document.getElementsByTagName("head")[0];var cssFile = document.createElement("link");cssFile.type = "text/css";cssFile.rel  = "stylesheet";cssFile.href = encodeURI(url);head.appendChild(cssFile);}

///////////////////
// Example stuff //
///////////////////
// Get(null, function(data){});
// Set({ "key1": "This is a string" }, function(){ /* after */ });
// Remove("key2", function(){});
// Clear(function(){});
//
//////////////////////////////////////////////////////
// Example on how the SendToServer function is used //
//////////////////////////////////////////////////////
// var formData = new FormData();
// formData.append("key1", "data1");
// formData.append("key2", "data2");
// SendToServer("post-url-here", formData, function(data){});

function BEK(){}

/////////////////////////////////////
// Initialize: Entry point for BEK //
/////////////////////////////////////
BEK.prototype.Initialize = function(){
  if(typeof disableBEK !== "undefined" && disableBEK) return; // For Wuks
  // LoadCSS(`${domain}/fek/css/fek-panel.css`);LoadCSS(`${domain}/fek/css/thread.css`); // CSS should only be loaded for development purposes

  var self = this;

  self.BEKversion       = "0.1.0";
  self.BEKpage          = "https://boards.na.leagueoflegends.com/en/c/general-discussion/U8uw8k1l";
  self.BEKgfx           = `${domain}/fek/gfx/misc/`;
  self.cIcons           = `${domain}/fek/gfx/iconsmallchampion/`;
  self.BEKgfxLargeChamp = `${domain}/fek/gfx/iconlargechampion/`;
  self.BEKgfxLargeSpell = `${domain}/fek/gfx/iconlargespell/`;
  self.BEKgfxLargeItem  = `${domain}/fek/gfx/iconlargeitem/`;
  self.BEKtweets        = [];
  self.activeKeys       = [];
  self.hotkeys          = [];
  self.users            = [];
  self.regions          = [];
  self.results          = [];

  self.title = $("#breadcrumbs h2")[0].textContent;

  // Get and save page data
  if     ($("#discussions").length) self.page = "Index";  // Board Index
  else if($("#comments").length)    self.page = "Thread"; // Inside a thread
  else                              self.page = "NULL";   // Not on the index or in a thread
  if(self.title == "My Updates")    self.page = "My Updates";

  if     (self.page == "Thread" && $(".flat-comments").length)      self.threadMode = "Chrono";  // Chronological Mode
  else if(self.page == "Thread" && $(".flat-comments").length == 0) self.threadMode = "Discuss"; // Discussion Mode
  else                                                              self.threadMode = "NULL";    // We're not in a thread

  self.alertPopUp = false; // Only one alert can display at a time
                           // 1: Can't connect to BEK server
                           // 2: BEK needs to be updated
                           // 3: API Error
                           // 4: Account Management

  //////////////////////////
  // Variables: User Data //
  //////////////////////////
  if($(".riotbar-summoner-info").length){
    self.myName   = $(".riotbar-summoner-name").first().text();
    self.myRegion = $(".riotbar-summoner-region").first().text();

    if     (self.myRegion == "North America")    self.myRegion = "NA";
    else if(self.myRegion == "Oceania")          self.myRegion = "OCE";
    else if(self.myRegion == "EU West")          self.myRegion = "EUW";
    else if(self.myRegion == "EU Nordic & East") self.myRegion = "EUNE";
  }

  /////////////////////////////////
  // Get Board's Platform Region //
  /////////////////////////////////
  var windowURL       = window.location.href;
  var start           = windowURL.indexOf(".") + 1;
  var end             = windowURL.indexOf(".", start);
  self.platformRegion = windowURL.substring(start, end);

  Get(null, function(data){
    if($.isEmptyObject(data))
      self.DefaultVariables();
    else{
      self.data = data;
      self.Main();
    }
  });
}

/////////////////////////////////////////////////
// DefaultVariables: Initializes BEK variables //
/////////////////////////////////////////////////
BEK.prototype.DefaultVariables = function(){
  var self = this;

  self.data = {
    "version":      self.BEKversion,
    "togglePanel":  "192",
    "blacklist":    {},
    "hiddenBoards": {}
  };

  Set(self.data, function(){
    self.Main();
  });
}

///////////////////////////////////////////////
// Main: Entry point after getting variables //
///////////////////////////////////////////////
BEK.prototype.Main = function(){
  var self = this;
  // console.log(self["data"]);

  // self.GetAnnouncements();
  self.AddBEKNavBar();
  self.CreateGUI();
  self.CreateFeatures();
  Set(self.data); // Save any new default data that may have happened from CreateFeatures
  self.SettleGUI();
  self.KeyWatch();

  if(self.page == "Index")
    self.WaitAndRun(".total-votes", self.LoadIndex);
  else if(self.page == "Thread")
    self.WaitAndRun(".profile-hover", self.QueryServer);

  self.RunMutationObserver();
}

///////////////////////////////////////////////////////
// GetAnnouncements: Gets announcements from Twitter //
///////////////////////////////////////////////////////
BEK.prototype.GetAnnouncements = function(){
  var formData = new FormData();
  SendToServer(`${domain}/querytweets`, formData, function(data){
    console.log(data);

    if(!data.length)
      return;

    var id         = data[0]["id"];
    var createdAt  = data[0]["created_at"];
    var name       = data[0]["name"];
    var screenName = data[0]["screen_name"];
    var avatar     = data[0]["profile_image_url"];
    var text       = data[0]["text"];

    // The latest announcement has NOT been read yet
    // Append alert icons for unread announcements
    // alertHTML = `<span id="bekalert" style="position:relative; top:-2px; padding:3px; padding-left:2px; padding-right:2px; font:8px bold Arial, Helvetica, 'Sans Serif'; border:1px solid #ff8800; margin-left:5px; background:#222222; border-radius:8px; color:#ffffff; text-shadow: 1px 1px rgba(0,0,0,.8);">NEW</span>`;

    // $(`a[href="#bek-panel"]`).eq(0).append(alertHTML);
    // $(`a[href="#bek-panel"]`).eq(1).append(alertHTML);
    // $(`#bek-panel #tab[tab="misc-announcements"]`).append(alertHTML);

    var twitterPopup = `
    <div id="bek-fixed-wrapper">
      <div class="bek-twitter-popup">
        <div class="bek-top">
          <div class="bek-float"><img src="${avatar}"></div>
          <div class="bek-date">${createdAt}</div>
          <div class="bek-text">${text}</div>
        </div>
        <div class="bek-bot">Click here to dismiss the notification</div>
      </div>
    </div>
    `;

    $(twitterPopup).appendTo("body");

    // $(`body #twitter_row.popup`).html(`
    // `);

    $("body #twitter_row.popup").fadeIn();

    $("#dismiss").click(function(event){
      // if(self.BEKtweets[0])
      //   GM_setValue("_lastReadTwitter", self.BEKtweets[0].id);

      $("body #twitter_row.popup").fadeOut();
      $("body #bekalert").each(function(){
        $(this).fadeOut();
        });
    });
  });
}

/////////////////////////////////////////////////////////////
// AddBEKNavBar: Adds a BEK dropdown to the navigation bar //
/////////////////////////////////////////////////////////////
BEK.prototype.AddBEKNavBar = function(){
  var self = this;

  self.WaitAndRun("#riotbar-navbar", function(){
    $("#riotbar-navbar").append(`
    <span class="riotbar-navbar-separator"></span>
    <a class="touchpoint-bek" href="#">B.E.K.</a>
    `);

    $(".touchpoint-bek").click(function(event){
      event.preventDefault();
      event.stopPropagation();
      self.PanelToggle();
    });
  });
}

////////////////////////////////////
// RunMutationObserver: Yolo Swag //
////////////////////////////////////
BEK.prototype.RunMutationObserver = function(){
  var self = this;

  /////////////////////////////////////////////
  // ========== MUTATION OBSERVER ========== //
  /////////////////////////////////////////////
  if(self.page == "Index" || self.page == "Thread"){
    var target;
    if     (self.page == "Index")                                  target = document.querySelector("#discussion-list");
    else if(self.page == "Thread" && self.threadMode == "Chrono")  target = document.querySelector("#comments");
    else if(self.page == "Thread" && self.threadMode == "Discuss") target = document.querySelector("#comments");

    var observer = new MutationObserver(function(mutations){
      if(self.page == "Index"){
        self.WaitAndRun(mutations[0].addedNodes[0].children[0], self.LoadIndex);
      }
      else if(self.page == "Thread"){
        // self.WaitAndRun(".profile-hover", "QueryServer");
        self.WaitAndRun(".profile-hover", self.QueryServer);
      }
    });

    var config = {attributes: true, childList: true, characterData: true};

    observer.observe(target, config);
  }
}

//////////////////////////////////////////////////
// CreateGUI: Creates the GUI for the BEK panel //
//////////////////////////////////////////////////
BEK.prototype.CreateGUI = function(){
  var self        = this;
  var tooltipHTML = `<div id="bektooltip">tooltip test</div>`;
  var panelHTML   = `
  <div id="bek-panel">
    <div class="col-left">
      <div class="version">v${self.BEKversion}</div>
      <div class="logo"></div>
      <div class="tabs"></div>
    </div>
    <div class="col-right">
      <div class="refreshNotice">Click here to save the changes.</div>
      <div class="scroll-region"></div>
    </div>
  </div>
  `;

  var documentBody = $("body:first-of-type").first();
  documentBody.append(panelHTML);
  documentBody.append(tooltipHTML);

  // Hide BEK Panel so the user doesn't see a whole bunch of random text for the second while the page loads
  $("#bek-panel").hide();
}

////////////////////////////////////////////////////////////
// CreateFeatures: This is where all BEK features are set //
////////////////////////////////////////////////////////////
BEK.prototype.CreateFeatures = function(){
  var self = this;
  var tabMetaData = {
    "tabGroup":      null,
    "tab":           null,
    "category":      null,
    "label":         null,
    "tooltip":       null,
    "options":       null,
    "defaultOption": null
  };

  //////////////////////
  // Feature: Avatars //
  //////////////////////
  featureMetaData = {
    "tabGroup": "Core Mods",
    "tab":      "LoL Boards",
    "category": "User Identities",
    "label":    "Avatars",
    "tooltip":  "The size of avatars",
    "options":  [
      "100|100x100",
      "125|125x125",
      "150|150x150",
      "175|175x175",
      "200|200x200"
    ],
    "defaultOption": "100"
  };

  self.CreateFeature(featureMetaData, function(option){
    // ?
  });

  ///////////////////////////////
  // Feature: Fallback Avatars //
  ///////////////////////////////
  // featureMetaData = {
  //   "tabGroup": "Core Mods",
  //   "tab":      "LoL Boards",
  //   "category": "User Identities",
  //   "label":    "Fallback Avatars",
  //   "tooltip":  "The avatar to use when a person doesn't have a BEK avatar.",
  //   "options":  [
  //    "off|Disable",
  //    "1|Trident (Dark)",
  //    "2|Trident (Light)",
  //    "3|Trident (Parchment)",
  //    "4|Poro (Dark)",
  //    "5|Poro (Light)",
  //    "6|Poro (Parchment)",
  //    "7|Happy Cloud (Dark)",
  //    "8|Happy Cloud (Light)",
  //    "9|Happy Cloud (Parchment)"
  //   ],
  //   "defaultOption": "off"
  // };

  // self.CreateFeature(featureMetaData, function(option){
  //   if     (option == "1") fallbackAvatar = self.BEKgfx + "no-avatar-trident-dark.gif";
  //   else if(option == "2") fallbackAvatar = self.BEKgfx + "no-avatar-trident-light.gif";
  //   else if(option == "3") fallbackAvatar = self.BEKgfx + "no-avatar-trident-parchment.gif";
  //   else if(option == "4") fallbackAvatar = self.BEKgfx + "no-avatar-poro-dark.gif";
  //   else if(option == "5") fallbackAvatar = self.BEKgfx + "no-avatar-poro-light.gif";
  //   else if(option == "6") fallbackAvatar = self.BEKgfx + "no-avatar-poro-parchment.gif";
  //   else if(option == "7") fallbackAvatar = self.BEKgfx + "no-avatar-dark.gif";
  //   else if(option == "8") fallbackAvatar = self.BEKgfx + "no-avatar-light.gif";
  //   else if(option == "9") fallbackAvatar = self.BEKgfx + "no-avatar-parchment.gif";
  // });

  ////////////////////////////////////////
  // Feature: Diamond only, no backtalk //
  ////////////////////////////////////////
  featureMetaData = {
    "tabGroup": "Core Mods",
    "tab":      "LoL Boards",
    "category": "User Identities",
    "label":    "No Backtalk",
    "tooltip":  "Diamond only, no backtalk",
    "options":  [],
    "defaultOption": "off"
  };

  self.CreateFeature(featureMetaData, function(option){
    if(option == "on"){
      $(".apollo-header").css("background-image",      `url(${domain}/fek/gfx/no-backtalk.png)`);
      $(".apollo-header").css("background-repeat",     "no-repeat");
      $(".apollo-header").css("background-position-x", "64px");
      $(".apollo-header").css("background-position-y", "30px");
      $(".apollo-header").css("margin-bottom",         "0px");
      $(".apollo-header").css("padding-bottom",        "40px");
    }
  });

  //////////////////////////////////
  // Feature: Thread highlighting //
  //////////////////////////////////
  featureMetaData = {
    "tabGroup": "Core Mods",
    "tab":      "LoL Boards",
    "category": "Navigation Enhancements",
    "label":    "Highlight My Threads",
    "tooltip":  "Highlights your threads a specific color on a board's index",
    "options":  [
      "off|Disable",
      "#000000|Black",
      "#400000|Red",
      "#442000|Orange",
      "#303000|Yellow",
      "#002800|Green",
      "#000A50|Blue",
      "#003737|Indigo",
      "#3b066b|Purple",
      "#9400D3|Violet",
      "#2b1d0e|Brown",
      "#2d2d2d|Gray"
    ],
    "defaultOption": "off"
  };

  self.CreateFeature(featureMetaData, function(option){
    // if(option != "off"){}
  });

  ///////////////////////////////
  // Feature: Enhanced Preview //
  ///////////////////////////////
  featureMetaData = {
    "tabGroup": "Core Mods",
    "tab":      "LoL Boards",
    "category": "Navigation Enhancements",
    "label":    "Enhanced Preview",
    "tooltip":  "Improves the preview of threads when you hover your mouse over them",
    "options":  [],
    "defaultOption": "on"
  };

  self.CreateFeature(featureMetaData, function(option){
    if(option != "off"){
      // self.enhanced();
    }
  });

  ////////////////////////
  // Feature: Blacklist //
  ////////////////////////
  featureMetaData = {
    "tabGroup": "Core Mods",
    "tab":      "Blacklist"
  };

  self.CreateTab(featureMetaData, function(option){
    $(`[tab="core-mods-blacklist"]`).click(function(){
      var groupView = $(`[group-view="core-mods-blacklist"]`)[0];
      var content   = "<h1>Blacklisted Users</h1><p>Click on a name to remove it from your blacklist</p>";

      for(var user in self.data["blacklist"]){
        content += `<a class="blacklist-remove" href="#">${user}<br></a>`;
      }

      $(groupView).html(content);

      $(".blacklist-remove").click(function(event){
        event.preventDefault();
        event.stopPropagation();
        var user = $(this).text();
        $(this).remove();
        delete self.data["blacklist"][user];
        Set(self.data);
      });

      return;

      var vals = GM_listValues();
      for(var i = 0; i < vals.length; i++){
        if(vals[i][0] != "_"){
          myThing = document.createElement("div");
          myThing.innerHTML = `<a href="#">${vals[i]}</a><br>`;

          $(myThing).click(function(event){
            event.preventDefault();
            event.stopPropagation();
            GM_deleteValue(this.textContent);
            this.remove();
          });

          contentview[0].appendChild(myThing);
        }
      }
    });
  });


  ////////////////////////////
  // Feature: Hidden Boards //
  ////////////////////////////
  var naBoards = [
    "Gameplay",
    "Player Behavior",
    "Story, Art, & Sound",
    "Player Recruitment",
    "Concepts & Creations",
    "Memes & Games",
    "Let's Talk: Boards",
    "General Discussion",
    "Esports",
    "Roleplay",
    "Mechs vs Minions",
    "Report a Bug"
  ];

  for(var i = 0; i < naBoards.length; i++){
    var boardName = naBoards[i];

    featureMetaData = {
      "tabGroup": "Core Mods",
      "tab":      "Hidden Boards",
      "category": "Hidden Boards",
      "label":    `${boardName}`,
      "tooltip":  `Turn this on to hide ${boardName} from the main page`,
      "options":  [],
      "defaultOption": "off"
    };

    self.CreateFeature(featureMetaData, function(option){}, self.data["hiddenBoards"]);
  }

  /////////////////////////////
  // Feature: Reset Settings //
  /////////////////////////////
  featureMetaData = {
    "tabGroup": "Miscellaneous",
    "tab":      "Reset"
  };

  self.CreateTab(featureMetaData, function(option){
    $(`[tab="miscellaneous-reset"]`).click(function(){
      var groupView = $(`[group-view="miscellaneous-reset"]`)[0];

      var content = `
      <div style="margin-bottom: 8px;"><input id="ResetSettings" type="button" value="Reset all settings"></div>
      <div style="margin-bottom: 8px;"><input id="ChangeHotkey"  type="button" value="Change control panel hotkey"></div>
      <div id="ChangeHotkeyInput" hidden>
        <p>Enter in the new hotkey below</p>
        <input id="NewHotkey" type="text"><br>
      </div>
      `;

      $(groupView).html(content);

      $("#ResetSettings").click(function(){
        if(confirm("Are you sure that you want to reset all settings?")){
          Clear();
          location.reload();
        }
      });

      $("#ChangeHotkey").click(function(){
        $("#ChangeHotkeyInput").removeAttr("hidden");
      });

      $("#NewHotkey").keydown(function(event){
        $("#NewHotkey").val("");
        $("#ChangeHotkeyInput").attr("hidden", "hidden");
        self.data["togglePanel"] = event.keyCode;
        Set(self.data);
        alert(`The shortcut key for opening up the BEK control panel has been changed to ${event.key}\n\nRefresh the page for this change to go in effect.`);
      });
    });
  });

  // ////////////
  // // SAMPLE //
  // ////////////
  // featureMetaData = {
  //   "tabGroup": "Core Mods",
  //   "tab":      "LoL Boards",
  //   "category": "User Identities",
  //   "label":    "Dropdown Test",
  //   "tooltip":  "This is the tooltip for Dropdown Test",
  //   "options":  [
  //     "off|Disable",
  //     "1|Option One",
  //     "2|Second choice",
  //     "3|Third is great",
  //     "4|Numbah four",
  //     "5|Fifth place",
  //     "6|Six sticks",
  //     "7|Probably seven",
  //     "8|Eight is great",
  //     "9|A fine nine",
  //     "10|Final ten"
  //   ],
  //   "defaultOption": "off"
  // };
  // self.CreateFeature(featureMetaData, function(option){});

  // featureMetaData = {
  //   "tabGroup": "Core Mods",
  //   "tab":      "LoL Boards",
  //   "category": "User Identities",
  //   "label":    "On Off Test",
  //   "tooltip":  "This is the tooltip for On Off Test",
  //   "options":  [],
  //   "defaultOption": "off"
  // };
  // self.CreateFeature(featureMetaData, function(option){});

  // Register the hotkey ~ to toggle the BEK panel on and off
  self.hotkeys[self.data["togglePanel"]] = function(state, event){
    if(state === "keyup" && !$("input").is(":focus") && !$("textarea").is(":focus"))
      self.PanelToggle();
  };

  // DEBUG: Clear all saved data when the "1" key is pressed
  // self.hotkeys["49"] = function(state, event){
  //   if(state === "keyup" && !$("input").is(":focus") && !$("textarea").is(":focus")){
  //     Clear();
  //     alert("Data cleared!");
  //   }
  // };

  return;

  //////////////////////////////
  // Feature: Enhanced Voting //
  //////////////////////////////
  tooltip = "Gives a green color to upvotes, and a red color to downvotes. Also gives you the choice of how to display votes when you hover your mouse over them.";
  options = ["off|Disable",
             "individual|Individual Votes",
             "total|Total Votes",
             "hide|Hide Votes"];

  CreateFeature("Enhanced Voting", "_enhancedVoting", options, "individual", tooltip, tabgroup, tab, category, function(option){
    votingDisplay = option;
  });

  ///////////////////////////
  // Feature: Blacklisting //
  ///////////////////////////
  tooltip = "Hides posts and threads made by users that you have on your blacklist. To blacklist somebody, hover your mouse over their avatar and click on blacklist";
  CreateFeature("Blacklisting", "_blacklisting", "", "on", tooltip, tabgroup, tab, category, function(option){
    blacklisting = option;
  });

  //////////////////////////////
  // Feature: OP Style Change //
  //////////////////////////////
  tooltip = "Removes the colored background on an original poster's posts.";
  CreateFeature("OP Style Change", "_opStyleChange", "", "on", tooltip, tabgroup, tab, category, function(option){
    OPStyle = option;
  });

  /////////////////////////////////////////
  // Feature: Remove Profile Hover Popup //
  /////////////////////////////////////////
  tooltip = "Removes Riot's profile popup when you hover over a user.";
  CreateFeature("Remove Profile Hover Popup", "_removeProfHovPop", "", "on", tooltip, tabgroup, tab, category, function(option){
    removeProfHovPop = option;
  });

  // Core Mods -> LoL Boards -> Navigation Enhancements
  tabgroup = "Core Mods";
  tab      = "LoL Boards";
  category = "Navigation Enhancements";

  //////////////////////////////////////
  // Feature: Enhanced Thread Preview //
  //////////////////////////////////////
  category = "Navigation Enhancements";
  tooltip  = "Replaces the default thread preview tooltip with a more visible and enhanced one.";
  CreateFeature("Enhanced Thread Preview", "_enhancedThreadPreview", "", "on", tooltip, tabgroup, tab, category, function(option){
    enhancedThreadPreview = option;
  });

  //////////////////////////////////
  // Feature: Thread Highlighting //
  //////////////////////////////////
  category = "Navigation Enhancements";
  tooltip  = "Threads created by you will have a colored background to stand out from the rest.";
  options = ["off|Disable",
             "#000000|Black",
             "#400000|Red",
             "#442000|Orange",
             "#303000|Yellow",
             "#002800|Green",
             "#003737|Cyan",
             "#000A50|Blue",
             "#551A8B|Purple",
             "#9400D3|Violet"];

  CreateFeature("Highlight My Threads", "_threadHighlight", options, "#000000", tooltip, tabgroup, tab, category, function(option){
    highlightMyThreads = option;
  });

  ///////////////////////////////////
  // Feature: Boards Dropdown Menu //
  ///////////////////////////////////
  category = "Navigation Enhancements";
  tooltip  = "Adds a dropdown menu when you hover your mouse over the Boards button at the top of the page on the navigation bar.";
  CreateFeature("Boards Dropdown Menu", "_boardsDropdownMenu", "", "on", tooltip, tabgroup, tab, category, function(option){
    boardsDropdownMenu = option;
  });

  /////////////////////////////////
  // Feature: Animate Thumbnails //
  /////////////////////////////////
  category = "Navigation Enhancements";
  tooltip  = "Animates thumbnails (if they have one) for a thread's image on the index. You may also choose to hide thumbnails completely.";
  options = ["off|Disable",
             "animate|Animate thumbnails",
             "hide|Hide thumbnails"];
  CreateFeature("Thumbnails", "_thumbnails", options, "animate", tooltip, tabgroup, tab, category, function(option){
    animateThumbnails = option;
  });

  ////////////////////////////
  // Feature: Sticky Navbar //
  ////////////////////////////
  category = "Navigation Enhancements";
  tooltip  = "Keeps the Navbar at the top of the browser window even when you scroll down.";
  CreateFeature("Sticky Navbar", "_stickyNavbar", "", "off", tooltip, tabgroup, tab, category, function(option){
    document.getElementById("riotbar-bar").style.setProperty("position", "fixed");
    document.getElementById("riotbar-bar").style.setProperty("top",      "0px");
  });

  ///////////////////////////////////////
  // Feature: Empty Vote Replacement //
  ///////////////////////////////////////
  category = "Navigation Enhancements";
  tooltip  = "If votes aren't displayed, extra stuff can be added to fill the gap.";
  options = ["off|Disable",
             "banners|Green banners",
             "bannersavatars|Green banners and avatars"];
  CreateFeature("Empty Vote Replacement", "_emptyvotereplacement", options, "off", tooltip, tabgroup, tab, category, function(option){
    emptyVoteReplacement = option;
  });

  // Core Mods -> LoL Boards -> Multimedia
  tabgroup = "Core Mods";
  tab      = "LoL Boards";
  category = "Multimedia";

  //////////////////////////////
  // Feature: Media Embedding //
  //////////////////////////////
  tooltip = "Embeds .webm and YouTube movies into the posts themselves, rather than showing up as just links.";
  CreateFeature("Media Embedding", "_mediaEmbedding", "", "on", tooltip, tabgroup, tab, category, function(option){
    embedMedia = option;
  });

  // Core Mods -> LoL Boards -> Miscellaneous
  tabgroup = "Core Mods";
  tab      = "LoL Boards";
  category = "Miscellaneous";

  ////////////////////////////////
  // Feature: Favorite Champion //
  ////////////////////////////////
  tooltip = "Champion icon that will be used when making posts.";
  options = ["aatrox|Aatrox",
             "ahri|Ahri",
             "akali|Akali",
             "alistar|Alistar",
             "amumu|Amumu",
             "anivia|Anivia",
             "annie|Annie",
             "ashe|Ashe",
             "azir|Azir",
             "bard|Bard",
             "blitzcrank|Blitzcrank",
             "brand|Brand",
             "braum|Braum",
             "caitlyn|Caitlyn",
             "cassiopeia|Cassiopeia",
             "chogath|Cho'Gath",
             "corki|Corki",
             "darius|Darius",
             "diana|Diana",
             "drmundo|Dr. Mundo",
             "draven|Draven",
             "ekko|Ekko",
             "elise|Elise",
             "evelynn|Evelynn",
             "ezreal|Ezreal",
             "fiddlesticks|Fiddlesticks",
             "fiora|Fiora",
             "fizz|Fizz",
             "galio|Galio",
             "gangplank|Gangplank",
             "garen|Garen",
             "gnar|Gnar",
             "gragas|Gragas",
             "graves|Graves",
             "hecarim|Hecarim",
             "heimerdinger|Heimerdinger",
             "irelia|Irelia",
             "janna|Janna",
             "jarvaniv|Jarvan IV",
             "jax|Jax",
             "jayce|Jayce",
             "jinx|Jinx",
             "kalista|Kalista",
             "karma|Karma",
             "karthus|Karthus",
             "kassadin|Kassadin",
             "katarina|Katarina",
             "kayle|Kayle",
             "kennen|Kennen",
             "khazix|Kha'Zix",
             "kindred|Kindred",
             "kogmaw|Kog'Maw",
             "leblanc|LeBlanc",
             "leesin|Lee Sin",
             "leona|Leona",
             "lissandra|Lissandra",
             "lucian|Lucian",
             "lulu|Lulu",
             "lux|Lux",
             "malphite|Malphite",
             "malzahar|Malzahar",
             "maokai|Maokai",
             "masteryi|Master Yi",
             "missfortune|Miss Fortune",
             "mordekaiser|Mordekaiser",
             "morgana|Morgana",
             "nami|Nami",
             "nasus|Nasus",
             "nautilus|Nautilus",
             "nidalee|Nidalee",
             "nocturne|Nocturne",
             "nunu|Nunu",
             "olaf|Olaf",
             "orianna|Orianna",
             "pantheon|Pantheon",
             "poppy|Poppy",
             "quinn|Quinn",
             "rammus|Rammus",
             "reksai|Rek'Sai",
             "renekton|Renekton",
             "rengar|Rengar",
             "riven|Riven",
             "rumble|Rumble",
             "ryze|Ryze",
             "sejuani|Sejuani",
             "shaco|Shaco",
             "shen|Shen",
             "shyvana|Shyvana",
             "singed|Singed",
             "sion|Sion",
             "sivir|Sivir",
             "skarner|Skarner",
             "sona|Sona",
             "soraka|Soraka",
             "swain|Swain",
             "syndra|Syndra",
             "tahmkench|Tahm Kench",
             "talon|Talon",
             "taric|Taric",
             "teemo|Teemo",
             "thresh|Thresh",
             "tristana|Tristana",
             "trundle|Trundle",
             "tryndamere|Tryndamere",
             "twistedfate|Twisted Fate",
             "twitch|Twitch",
             "udyr|Udyr",
             "urgot|Urgot",
             "varus|Varus",
             "vayne|Vayne",
             "veigar|Veigar",
             "velkoz|Vel'Koz",
             "vi|Vi",
             "viktor|Viktor",
             "vladimir|Vladimir",
             "volibear|Volibear",
             "warwick|Warwick",
             "wukong|Wukong",
             "xerath|Xerath",
             "xinzhao|Xin Zhao",
             "yasuo|Yasuo",
             "yorick|Yorick",
             "zac|Zac",
             "zed|Zed",
             "ziggs|Ziggs",
             "zilean|Zilean",
             "zyra|Zyra"];
  CreateFeature("Favorite Champion", "_favoritechampion", options, "fizz", tooltip, tabgroup, tab, category, function(option){
    favoriteChampion = option;
  });

  //////////////////////////////////////
  // Feature: Favorite Summoner Spell //
  //////////////////////////////////////
  tooltip = "Spell icon that will be used when making posts.";
  options = ["barrier|Barrier",
             "clairvoyance|Clairvoyance",
             "clarity|Clarity",
             "cleanse|Cleanse",
             "exhaust|Exhaust",
             "flash|Flash",
             "garrison|Garrison",
             "ghost|Ghost",
             "heal|Heal",
             "ignite|Ignite",
             "mark|Mark",
             "porotoss|Poro Toss",
             "smite|Smite",
             "teleport|Teleport",
             "totheking|To the King"];
  CreateFeature("Favorite Summoner Spell", "_favoritesummonerspell", options, "ignite", tooltip, tabgroup, tab, category, function(option){
    favoriteSpell = option;
  });

  ////////////////////////////
  // Feature: Favorite Item //
  ////////////////////////////
  tooltip = "Item icon that will be used when making posts.";
  options = ["blackcleaver|Black Cleaver",
             "bladeoftheruinedking|Blade of the Ruined King",
             "bootsofmobility|Boots of Mobility",
             "bootsofswiftness|Boots of Swiftness",
             "deathfiregrasp|Deathfire Grasp",
             "deathsdance|Death's Dance",
             "deathsdaughter|Death's Daughter",
             "doransring|Doran's Ring",
             "essencereaver|Essence Reaver",
             "frostqueensclaim|Frost Queen's Claim",
             "headofkhazix|Head of Kha'Zix",
             "hextechglp800|Hextech GLP-800",
             "hextechgunblade|Hextech Gunblade",
             "hextechprotobelt01|Hextech Protobelt-01",
             "huntersmachete|Hunter's Machete",
             "infinityedge|Infinity Edge",
             "lastwhisper|Last Whisper",
             "liandrystorment|Liandry's Torment",
             "lichbane|Lich Bane",
             "locketoftheironsolari|Locket of the Iron Solari",
             "lostchapter|Lost Chapter",
             "orbofwinter|Orb of Winter",
             "phantomdancer|Phantom Dancer",
             "rabadonsdeathcap|Rabadon's Deathcap",
             "ravenoushydra|Ravenous Hydra",
             "sightstone|Sightstone",
             "talismanofascension|Talisman of Ascension",
             "tearofthegoddess|Tear of the Goddess",
             "theblackcleaver|The Black Cleaver",
             "thornmail|Thornmail",
             "trinityforce|Trinity Force",
             "warmogsarmor|Warmog's Armor",
             "youmuusghostblade|Youmuu's Ghostblade",
             "zeal|Zeal",
             "zhonyashourglass|Zhonya's Hourglass",
             "zzrotportal|Zz'Rot Portal"];
  CreateFeature("Favorite Item", "_favoriteitem", options, "lichbane", tooltip, tabgroup, tab, category, function(option){
    favoriteItem = option;
  });

  /////////////////////////////
  // Feature: Favorite Icons //
  /////////////////////////////
  tooltip  = "How favorite icons (champion/spell/item) are displayed.";
  options = ["off|Disable",
             "on|Always On",
             "mouseover|Mouse Over"];
  CreateFeature("Favorite Icons", "_favoriteicons", options, "mouseover", tooltip, tabgroup, tab, category, function(option){
    favoriteIcons = option;
  });

  ////////////////////////
  // Feature: Roll Dice //
  ////////////////////////
  tooltip = "Shows dice rolls. Disable this feature to completely hide them.";
  CreateFeature("Roll Dice", "_rollDice", "", "on", tooltip, tabgroup, tab, category, function(option){
    rollDice = option;
  });

  ///////////////////////////
  // Feature: Blacklisting //
  ///////////////////////////
  if(blacklisting == "on"){
    PanelCreateTab(tabgroup, "Blacklist", function(contentview){
      $(`#tab[tab="core-mods-blacklist"]`).click(function(){
        contentview.html("<h1>Blacklisted Users</h1><br>Click on a name to remove it from your blacklist<br><br>");

        var vals = GM_listValues();
        for(var i = 0; i < vals.length; i++){
          if(vals[i][0] != "_"){
            myThing = document.createElement("div");
            myThing.innerHTML = `<a href="#">${vals[i]}</a><br>`;

            $(myThing).click(function(event){
              event.preventDefault();
              event.stopPropagation();
              GM_deleteValue(this.textContent);
              this.remove();
            });

            contentview[0].appendChild(myThing);
          }
        }
      });
    });
  }

  // Core Mods -> Hidden Boards -> These boards are hidden from the front page
  tabgroup = "Core Mods";
  tab      = "Hidden Boards";
  category = "These boards are hidden from the front page";

  /////////////////////////////
  // Feature: Hide Subboards //
  /////////////////////////////
  function HideSubboard(boardName, optionVar){
    tooltip  = "Hide threads from " + boardName;

    CreateFeature(boardName, optionVar, "", "off", tooltip, tabgroup, tab, category, function(option){
      hide[boardName] = option;
    });
  }

  HideSubboard("Gameplay",                     "_gameplay");
  HideSubboard("Story, Art, & Sound",          "_storyartsound");
  HideSubboard("Esports",                      "_esports");
  HideSubboard("Team Recruitment",             "_teamrecruitment");
  HideSubboard("Concepts & Creations",         "_conceptscreations");
  HideSubboard("Player Behavior & Moderation", "_playerbehaviormoderation");
  HideSubboard("Miscellaneous",                "_miscellaneous");
  HideSubboard("Memes & Games",                "_memesgames");
  HideSubboard("General Discussion",           "_generaldiscussion");
  HideSubboard("Roleplay",                     "_roleplay");
  HideSubboard("Help & Support",               "_helpsupport");
  HideSubboard("Report a Bug",                 "_reportabug");
  HideSubboard("Boards Feedback",              "_boardsfeedback");

  /////////////////////////
  // Feature: Fish Chips //
  /////////////////////////
  PanelCreateTab(tabgroup, "Fish Chips", function(contentview){
    $(`#tab[tab="core-mods-fish-chips"]`).click(function(){
      self.LoadWebPanel("fishchips", contentview);
    });
  });

  // New Tabgroup: Social
  tabgroup = "Social";

  PanelCreateTab(tabgroup, "Friends", function(contentview){
    $(`#tab[tab="social-friends"]`).click(function(){
      self.LoadWebPanel("friends", contentview);
    });
  });

  PanelCreateTab(tabgroup, "Messages", function(contentview){
    $(`#tab[tab="social-messages"]`).click(function(){
      self.LoadWebPanel("messages", contentview);
    });
  });

  PanelCreateTab(tabgroup, "Send PM", function(contentview){
    $(`#tab[tab="social-send-pm"]`).click(function(){
      self.LoadWebPanel("sendpm", contentview);
    });
  });

  // New Tabgroup: BEK
  tabgroup = "BEK";

  ///////////////////////////
  // Twitter Announcements //
  ///////////////////////////
  PanelCreateTab(tabgroup, "Announcements", function(contentview){
    contentview.html("Loading Announcements...");

    // Prepare the twitter popup html
    var docbody = $("html").first().find("body:not(.wysiwyg)").first();
    docbody.append(`<div id="twitter_row" class="popup"></div>`);

    $(document).on("tweetsLoaded", function(){
      contentview.html("<h1>Announcements</h1>");
      if(self.BEKtweets.length){
        for(var i = 0; i < self.BEKtweets.length; i++){
          contentview.append(`
          <div id="twitter_row">
            <div id="twitterlink">
              <a href="https://twitter.com/${self.BEKtweets[i].user[0]}" target="_blank">
                <img src="${self.BEKgfx}twittericon.png">
              </a>
            </div>
            <h2>${ParseTwitterDate(self.BEKtweets[i].created_at)}</h2>
            <img id="twitter_img" src="${self.BEKtweets[i].user[2]}">
            <span id="twitter_text">${ReplaceUrlWithHtmlLink(self.BEKtweets[i].text.replace("#BEK ", ""))}</span>
            <span style="opacity:0; clear:both;">.</span>
            <div id="spike"></div>
          </div>
          `);
        }

        //Compare last read announcement to current one
        if(false){
        // if(GM_getValue("_lastReadTwitter", "") == self.BEKtweets[0].id){
          // The latest announcement has been read
        }else{
          // The latest announcement has NOT been read yet
          // Append alert icons for unread announcements
          alertHTML = `<span id="bekalert" style="position:relative; top:-2px; padding:3px; padding-left:2px; padding-right:2px; font:8px bold Arial, Helvetica, 'Sans Serif'; border:1px solid #ff8800; margin-left:5px; background:#222222; border-radius:8px; color:#ffffff; text-shadow: 1px 1px rgba(0,0,0,.8);">NEW</span>`;

          $(`a[href="#bek-panel"]`).eq(0).append(alertHTML);
          $(`a[href="#bek-panel"]`).eq(1).append(alertHTML);
          $(`#bek-panel #tab[tab="misc-announcements"]`).append(alertHTML);
          $(`body #twitter_row.popup`).html(`
          <div id="twitterlink">
            <a href="https://twitter.com/Tundra_Fizz" target="_blank">
              <img src="${self.BEKgfx}twittericon.png">
            </a>
          </div>
          <h2>
            ${ParseTwitterDate(self.BEKtweets[0].created_at)}
          </h2>
          <img id="twitter_img" src="${self.BEKtweets[0].user[2]}">
          <span id="twitter_text">
            ${ReplaceUrlWithHtmlLink(self.BEKtweets[0].text.replace("#BEK ", ""))}
          </span>
          <div id="dismiss">
            Click here to dismiss the notification
          </div>
          <span style="opacity:0; clear:both;">
            .
          </span>
          <div id="spike"></div>
          `);

          $("body #twitter_row.popup").fadeIn();
        }
      }

      // Now we need to have it mark announcements as read when dismissed or announcement tab is clicked
      $("#dismiss").click(function(event){
        if(self.BEKtweets[0])
          GM_setValue("_lastReadTwitter", self.BEKtweets[0].id);
        $("body #twitter_row.popup").fadeOut();
        $("body #bekalert").each(function(){
          $(this).fadeOut();
        });
      });
    });
  });

  ///////////////
  // Changelog //
  ///////////////
  PanelCreateTab(tabgroup, "Changelog", function(contentview){
    $(`#tab[tab*="bek-changelog"]`).click(function(){
      self.LoadWebPanel("changelog", contentview);
    });
  });

  ////////////
  // Donate //
  ////////////
  PanelCreateTab(tabgroup, "Donate", function(contentview){
    $(`#tab[tab*="bek-donate"]`).click(function(){
      self.LoadWebPanel("donate", contentview);
    });
  });
}

///////////////////////////////////////////////////////
// CreateTab: Creates a tab in the BEK control panel //
///////////////////////////////////////////////////////
BEK.prototype.CreateTab = function(featureMetaData, callback){
  var self          = this;
  var tabGroup      = featureMetaData["tabGroup"];
  var tab           = featureMetaData["tab"];
  var tabGroup2     = tabGroup.replace(/[^a-z0-9\s]/gi, "").replace(/[_\s]/g, "-").toLowerCase();
  var tab2          = tab.replace(/[^a-z0-9\s]/gi, "").replace(/[_\s]/g, "-").toLowerCase();

  // Create the tabGroup if we need to
  if($(`#bek-panel [tab-group="${tabGroup2}"]`).length == 0){
    $(`#bek-panel .tabs`).append(`
    <div class="tab-group" tab-group="${tabGroup2}">
      <h1>${tabGroup}</h1>
    </div>
    `);
  }

  // Create the tab if we need to
  if($(`#bek-panel [tab="${tabGroup2}-${tab2}"]`).length == 0){
    $(`#bek-panel [tab-group="${tabGroup2}"]`).append(`
    <div class="tab" tab="${tabGroup2}-${tab2}">
      ${tab}
      <div class="indicator"></div>
    </div>
    `);
  }

  // Create the groupview if we need to
  if($(`#bek-panel [group-view="${tabGroup2}-${tab2}"]`).length == 0){
    $("#bek-panel .scroll-region").append(`
    <div class="group-view" group-view="${tabGroup2}-${tab2}"></div>
    `);
  }

  // Execute the callback
  callback();
}

////////////////////////////////////////////////////////////
// CreateFeature: Used within the CreateFeatures function //
////////////////////////////////////////////////////////////
BEK.prototype.CreateFeature = function(featureMetaData, callback, mod = null){
  var self          = this;

  var storage = self.data;
  if(mod)
    storage = mod;

  var tabGroup      = featureMetaData["tabGroup"];
  var tab           = featureMetaData["tab"];
  var category      = featureMetaData["category"];
  var label         = featureMetaData["label"];
  var tooltip       = featureMetaData["tooltip"];
  var options       = featureMetaData["options"];
  var defaultOption = featureMetaData["defaultOption"];
  var hasDropDown   = "false";
  var optionsType   = "binary";
  var optionsKeys   = [];
  var optionsVals   = [];
  var currentKey    = storage[label];
  var currentVal    = null;
  var validOption   = false;
  var optionList    = "";
  var listhtml      = "";
  var labelContent  = "";
  var tabGroup2     = tabGroup.replace(/[^a-z0-9\s]/gi, "").replace(/[_\s]/g, "-").toLowerCase();
  var tab2          = tab.replace(/[^a-z0-9\s]/gi, "").replace(/[_\s]/g, "-").toLowerCase();
  var category2     = category.replace(/[^a-z0-9\s]/gi, "").replace(/[_\s]/g, "-").toLowerCase();
  var label2        = label.replace(/[^a-z0-9\s]/gi, "").replace(/[_\s]/g, "-").toLowerCase();

  if(options.length){
    optionsType = "dropdown";
    hasDropDown = "true";

    for(var i = 0; i < options.length; ++i){
      optionsKeys.push(options[i].split("|")[0]);
      optionsVals.push(options[i].split("|")[1]);
    }
  }else{
    optionsKeys.push("on");
    optionsKeys.push("off");
    optionsVals.push("on");
    optionsVals.push("off");
  }

  // Check if the saved value is valid for features with multiple options
  if(optionsType == "dropdown"){
    for(var i = 0; i < optionsKeys.length; ++i){
      if(currentKey == optionsKeys[i]){
        validOption = true;
        break;
      }
    }
  }
  // Check if the saved value is valid for on/off features
  else if(currentKey == "on" || currentKey == "off")
    validOption = true;

  if(!validOption)
      currentKey = storage[label] = defaultOption;

  // Get the index of the current key and then get the value from that index
  for(var i = 0; i < options.length; i++){
    var option = options[i].split("|");
    if(currentKey == option[0])
    currentVal = option[1];
  }

  // Create the tabGroup if we need to
  if($(`#bek-panel [tab-group="${tabGroup2}"]`).length == 0){
    $(`#bek-panel .tabs`).append(`
    <div class="tab-group" tab-group="${tabGroup2}">
      <h1>${tabGroup}</h1>
    </div>
    `);
  }

  // Create the tab if we need to
  if($(`#bek-panel [tab="${tabGroup2}-${tab2}"]`).length == 0){
    $(`#bek-panel [tab-group="${tabGroup2}"]`).append(`
    <div class="tab" tab="${tabGroup2}-${tab2}">
      ${tab}
      <div class="indicator"></div>
    </div>
    `);
  }

  // Create the groupview if we need to
  if($(`#bek-panel [group-view="${tabGroup2}-${tab2}"]`).length == 0){
    $("#bek-panel .scroll-region").append(`
    <div class="group-view" group-view="${tabGroup2}-${tab2}"></div>
    `);
  }

  // Create the category if we need to
  if($(`#bek-panel [category="${tabGroup2}-${tab2}-${category2}"]`).length == 0){
    $(`#bek-panel [group-view="${tabGroup2}-${tab2}"]`).append(`
      <div class="category" category="${tabGroup2}-${tab2}-${category2}">
        <div class="category-name">${category}</div>
      </div>
    `);
  }

  if(options.length){
    labelContent = `
    <p>${label}</p>
    <p>${currentVal}</p>
    `;

    var list = "";

    for(var i = 0; i < options.length; i++){
      var option = options[i].split("|");
      list += `<li data="${option[0]}">${option[1]}</li>`;
    }

    optionList = `
    <div class="option-list">
      <ul>${list}</ul>
    </div>
    `;
  }else{
    labelContent = `<p>${label}</p>`;
  }

  var yoloSwag = `
  <div class="setting" dropdown=${hasDropDown} data=${currentKey}>
    <div class="data-container">
      <div class="tooltip-data">
        <span id="ttlabel">${label}</span><br>
        <p>${tooltip}</p>
      </div>
      <div class="indicator"></div>
      <div class="label">
        <div class="content">${labelContent}</div>
      </div>
    </div>
    ${optionList}
  </div>
  `;

  $(`#bek-panel [category="${tabGroup2}-${tab2}-${category2}"]`).append(yoloSwag);

  // Run the feature by callback if it isn't disabled
  if(currentKey !== "off")
    callback(currentKey);
}

////////////////////////////////////////////////////////////
// SettleGUI: Sets the BEK panel to the default first tab //
////////////////////////////////////////////////////////////
BEK.prototype.SettleGUI = function(){
  $("#bek-panel .tab:first").addClass("active");
  $("#bek-panel .group-view:first-child").css("display", "block");
}

//////////////////////////////////////
// KeyWatch: Watches for keypresses //
//////////////////////////////////////
BEK.prototype.KeyWatch = function(){
  var self = this;

  // Clear the active keys when the window is focused or when the text area is refocused
  $(window).focus(function(){
    self.activeKeys = [];
  });

  // Watch for key modifiers being held down
  $(document).keydown(function(event){
    var i = self.activeKeys.indexOf(event.which);
    if(i == -1)
      self.activeKeys.push(event.which);

    if(self.hotkeys[event.which] && typeof self.hotkeys[event.which] === "function")
      self.hotkeys[event.which]("keydown", event);
  });

  // Watch for key modifiers being released
  $(document).keyup(function(event){
    if(self.hotkeys[event.which] && typeof self.hotkeys[event.which] === "function")
      self.hotkeys[event.which]("keyup", event);

    var i = self.activeKeys.indexOf(event.which);

    if(i != -1)
      self.activeKeys.splice(i, 1);
  });

  // Setup the bek tooltip
  $(document).on("mousemove", function(e){
    if($("#bektooltip").css("opacity") > 0){
      $("#bektooltip").css({
        left: e.pageX + 15,
        top:  e.pageY - 30
      });
    }else{
      $("#bektooltip").css({
        left: -10000
      });
    }
  });

  $("#bek-panel .setting").mouseenter(function(){
    $("#bektooltip").html($(this).find(".tooltip-data").html());
    $("#bektooltip").css("opacity", 1);
  });

  $("#bek-panel .setting").mouseleave(function(){
    $("#bektooltip").css("opacity", 0);
  });

  // Allow clicking away from the panel to close the panel
  $("body").click(function(){
    self.PanelHide();
  });

  $("#bek-panel").click(function(event){
    event.stopPropagation();
    $("#bek-panel .setting").find("ul").hide();
  });

  // Register click events and activates the beklink tabs
  $("body").on("click", `a[href*="#bektab"]`, function(event){
    event.stopPropagation();
    event.preventDefault();
    var tab = $(this).attr("href").replace("#bektab-","");
    $(`#tab[tab="${tab}"]`).trigger("click");
    self.PanelShow();
  });

  $(`a[href="#bek-panel"]`).click(function(event){
    event.stopPropagation();
    event.preventDefault();
    self.PanelToggle();
  });

  $("#bek-panel .tab").click(function(){
    $("#bek-panel .tab").each(function(){
      // Remove all contentviews and active tabs
      $(this).removeClass("active");
      $("#bek-panel .group-view").hide();
    });

    var thisTab = $(this).attr("tab");

    $("#bek-panel .scroll-region").scrollTop(0);
    $(`#bek-panel [group-view="${thisTab}"]`).show();
    self.InitScrollbar(".scroll-region");
    $(this).addClass("active");
  });

  $("#bek-panel").on("mousewheel", function(event){
    event.preventDefault();
  });

  $("#bek-panel .setting").find("ul").on("mousewheel", function(event){
    event.stopPropagation();
    event.preventDefault();
  });

  $("#bek-panel .setting").click(function(event){
    event.stopPropagation();
    if($(this).attr("dropdown") == "true"){
      if($(this).find("ul").is(":visible"))
        $(this).find("ul").hide();
      else{
        $("#bek-panel .setting").find("ul").hide();
        $(this).find("ul").show();
        $(this).find("ul").scrollTop(0);
        self.InitScrollbar($(this).find("ul"));
      }
    }else{
      var key = $(".data-container > .label > .content > p", this).text();
      var val = $(this).attr("data");
      $("#refreshNotice").addClass("visible");
      if($(this).attr("data") == "off"){
        $(this).attr("data", "on");

        if($($(this).parent().find(".category-name")[0]).text() == "Hidden Boards")
          self.data["hiddenBoards"][key] = "on";
        else
          self.data[key] = "on";

        Set(self.data);
      }else{
        $(this).attr("data", "off");

        if($($(this).parent().find(".category-name")[0]).text() == "Hidden Boards")
          self.data["hiddenBoards"][key] = "off";
        else
          self.data[key] = "off";

        Set(self.data);
      }
    }
  });

  $("#bek-panel .setting ul li").click(function(){
    var setting        = $(this).closest(".setting");
    var previousChoice = $(setting).attr("data");
    var key            = $(".data-container > .label > .content > p:nth-child(1)", setting).text()
    var val            = $(this).attr("data");
    var newText        = $(this).text();
    if(previousChoice !== val){
      $(setting).attr("data", val);
      $(".data-container .label .content p:nth-child(2)", setting).html(newText);

      // SAVE THE SETTING HERE!
      $("#refreshNotice").addClass("visible");

      self.data[key] = val;
      Set(self.data);
    }
  });

  $("#refreshNotice").click(function(){
    location.reload();
  });
}

////////////////////////////////////////////////////////////////
// PanelCreateTab: Creates a new tab on the BEK control panel //
////////////////////////////////////////////////////////////////
BEK.prototype.PanelCreateTab = function(tabgroup, tab, callback){
  // This will create a tab and content view with the supplied paramaters and send the contentview element back to the calling function
  // Prepare special compatible/safe tag names by replacing characters and casing
  var stabgroup = tabgroup.replace( /[^a-z0-9\s]/gi, "").replace(/[_\s]/g, "-").toLowerCase();
  var stab      = tab.replace( /[^a-z0-9\s]/gi, "").replace(/[_\s]/g, "-").toLowerCase();

  // Check if the tabgroup exists
  if($(`#bek-panel .col-left .tabgroup[tabgroup="${stabgroup}"]`).length <= 0){
    // Create the tabgroup
    $(`#bek-panel .col-left .tabs`).append(`
    <div class="tabgroup" tabgroup="${stabgroup}">
      <h1>${tabgroup}</h1>
    </div>
    `);
  }

  // Create the tab it if doesn't exist
  if($(`#tab[tab="${stabgroup}-${stab}"]`).length == 0)
    $(`#tabgroup[tabgroup="${stabgroup}"]`).append(`
    <div id="tab" tab="${stabgroup}-${stab}">
      ${tab}
      <div id="indicator"></div>
    </div>
    `);

  // Create the contentview if it doesn't exist
  if($(`#bek-panel .col-right .scroll-region .contentview[tablink="${stabgroup}-${stab}"]`).length == 0)
    $("#bek-panel .col-right .scroll-region").append(`
    <div id="contentview" tablink="${stabgroup}-${stab}"></div>
    `);

  // Now that we've setup the tab and contentview panel, lets send the contentview through the callback
  callback($(`#contentview[tablink="${stabgroup}-${stab}"]`));
}

///////////////////////////////////////////////////////////////////////
// QueryServer: Makes a connection to the BEK server for information //
///////////////////////////////////////////////////////////////////////
BEK.prototype.QueryServer = function(self){
  // Features that can be done right away without needing data from the BEK server
  self.WaitAndRun(".riot-voting > .total-votes", self.ColorVotes);
  self.WaitAndRun(".riot-voting > .total-votes", self.HoverVotes);

  self.users   = [];
  self.regions = [];

  $(".inline-profile").each(function(){
    var username = this.getElementsByClassName("username")[0].textContent;
    var region   = this.getElementsByClassName("realm")[0].textContent;
        region   = region.substring(1, region.length - 1);

    // BEK staff have special gradient names, so I need to extract them using this method
    if(this.getElementsByClassName("pxg-set").length > 0)
      username = this.getElementsByClassName("pxg-set")[0].childNodes[0].textContent;

    self.users.push(username);
    self.regions.push(region);
  });

  var formData = new FormData();
  formData.append("name",    self.myName);
  formData.append("region",  self.myRegion);
  formData.append("users",   self.users);
  formData.append("regions", self.regions);

  SendToServer(`${domain}/database`, formData, function(data){
    self.results        = data.records;
    self.BEKtweets = data.announcements;
    BEKevent       = data.event;
    var unixTime   = Math.floor(Date.now() / 1000);

    // THIS FEATURE TEMPORARILY DISABLED!
    // if((unixTime > BEKevent.start) && (unixTime < BEKevent.end))
    if(0){
      var NavBarEvent = document.createElement("li");
      var html = `
      <a href="#">Event</a>
      <div id="bek-event">
        <div id="bek-event-top">${BEKevent.message}</div>
        <div id="bek-event-bottom-left">
          <a href="${BEKevent.stream}" target="_blank" style="padding: 2px;">Twitch Stream</a>
        </div>
        <div id="bek-event-bottom-right">
          <a href="${BEKevent.thread}" target="_blank" style="padding: 2px;">Boards Thread</a>
        </div>
      </div>
      `;

      AddToNavBar(NavBarEvent, "touchpoint-event", html, self.riotBar, 8);

      window.setInterval(function(){$(".touchpoint-event").toggleClass("pulse");}, 1000);

      // Hides dropdown event information by default, and displays it with mouse hover
      $("#bek-event").hide();
      $(".touchpoint-event").hover(function() {$("#bek-event").show();}, function(){$("#bek-event").hide();});
    }

    // SKIP CHECKING FOR VERSIONS (for now at least)
    if(0){
      if(self.BEKversion != self.results.version && window.location.href != self.BEKpage){
        var html = `
        There has been an update to BEK!<br><br>
        <a href="${self.results.details}" style="color:#00C0FF;">Click here</a>
        for the post detailing new changes and to download version ${self.results.version}
        `;

        CreateAlertBox("14px", "#990000", "#DD0000", "#FFFFFF", html);
      }else{
        if(typeof self.results.apiStatusCode !== "undefined" && self.alertPopUp === false){
          CreateAlertBox("14px", "#990000", "#DD0000", "#FFFFFF",
                         "Error " + self.results.apiStatusCode + ": " + self.results.apiMessage);
        }

        if(typeof self.results.alert !== "undefined" && self.alertPopUp === false){
          CreateAlertBox(self.results.top, self.results.color1, self.results.color2, self.results.font,
                         self.results.alert);
        }
      }
    } // SKIP CHECKING FOR VERSIONS (for now at least)

    if(self.page == "Thread")
      self.FormatAllPosts(true);

    // $.event.trigger({type: "tweetsLoaded"});
  });
}

//////////////////////////////////////////////////////////////////////
// FormatAllPosts: Calls FormatSinglePost on every post that exists //
//////////////////////////////////////////////////////////////////////
BEK.prototype.FormatAllPosts = function(BEKData = false){
  var self = this;

  // Remove all "isOP" classes from the page to prevent names in regular posts from being white
  $("*").removeClass("isOP");

  // This removes the thing that mimimizes posts in Discussion View
  // This isn't desirable because it restricts freedom for Discussion View
  $(document).find(".toggle-minimized").remove();

  if(!BEKData){
    if(document.getElementsByClassName("op-container")[0].getElementsByClassName("inline-profile").length){
      $(".op-container").each(function(){
        self.FormatSinglePost2(this, true);
      });
    }

    $(".body-container").each(function(){
      self.FormatSinglePost2(this, false);
    });
  }else{
    if(document.getElementsByClassName("op-container")[0].getElementsByClassName("inline-profile").length){
      $(".op-container").each(function(){
        self.FormatSinglePost2(this, true);
      });
    }

    $(".body-container").each(function(){
      // Only execute the function if the post is not deleted
      if(!$($(this).find(".deleted")[0]).is(":visible"))
        self.FormatSinglePost2(this, false);
    });
  }

  // isMinimized
  $(".toggle-minimized").click(function(){
    alert("DO NOT MINIMIZE POSTS YET! BEK still needs to properly handle them...");
    // Put everything in a container and then hide it

    var post = $(this).parent()[0];

    if($(this).parent().hasClass("isMinimized")){
      // Minimizing the post

      if($(post).find(".hide-post").length == 0){
        // If the container doesn't exist, make it
        // Classes:
        // 0. masthead
        // 1. toggle-minimized
        // 2. newline
        // 3. small
        // 4. body-container
        // 5. list
        // 6. paging
        //
        // Put 2-5 in their own span and keep it between 1 and 7

        var testing = document.createElement("span");
        $(testing).attr("class", "hide-post");

        $(testing).append($(post).find(".new-line")[0]);
        $(testing).append($(post).find(".small")[0]);
        $(testing).append($(post).find(".body-container")[0]);
        $(testing).append($(post).find(".list")[0]);

        // Finally append it to the post
        $(testing).insertAfter($(post).find(".toggle-minimized")[0]);
        $(testing).css("display", "none");
      }else{
        // If the container already exists
        $($(post).find(".hide-post")[0]).css("display", "none");
      }
    }else{
      // Maximizing the post
      $($(post).find(".hide-post")[0]).css("display", "");

      // Load BEK stuff for posts
      var list = $(post).find(".list")[0];

      $(list).each(function(){
        $(".body-container").each(function(){
          FormatSinglePost1(this, false);
          FormatSinglePost2(this, false);
          // ColorVotes();
          // HoverVotes();
          $(".toggle-minimized").each(function(){$(this).css("z-index", "1");});
        });
      });
    }
  })
}

///////////////////////////////
// FormatSinglePost1: DELETE //
///////////////////////////////
BEK.prototype.FormatSinglePost1 = function(obj, op){
  // alert("FormatSinglePost1");
  // alert("FormatSinglePost1");
}

/////////////////////////////////////////////////////////////////
// FormatSinglePost2: Inserts BEK data into the formatted post //
/////////////////////////////////////////////////////////////////
BEK.prototype.FormatSinglePost2 = function(obj, op){
  var self      = this;
  var usernameT = obj.getElementsByClassName("username")[0].textContent;
  var regionT   = obj.getElementsByClassName("realm")[0].textContent;
  regionT       = regionT.substring(1, regionT.length - 1);

  // Hide blacklisted posts
  if(`${usernameT} (${regionT})` in self.data["blacklist"]){
    $(obj).parent()[0].remove();
    return;
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////

  // Define standard variables for this scope
  var riotVoting    = $(obj).parent()[0].getElementsByClassName("riot-voting")[0];
  var inlineProfile = obj.getElementsByClassName("inline-profile")[0];
  var profHover     = obj.getElementsByClassName("profile-hover")[0];
  var timeago       = obj.getElementsByClassName("timeago")[0];
  var icon          = obj.getElementsByTagName("img")[0];
  var body          = obj.getElementsByClassName("body")[0];
  var isRioter      = obj.getElementsByClassName("isRioter")[0];
  var username      = obj.getElementsByClassName("username")[0];
  var region        = obj.getElementsByClassName("realm")[0];
  var myIcon        = $(".profile-hover > span:nth-child(1)", obj)[0];

  var colorrr = $(username).css("color");

  // Get the correct element depending on if the poster is a regular user or belongs to a special group
  var tinyIcon;

  if($(".riot-fist", obj).length){
    // console.log("RIOTER");
    var prependThis = `<img src="https://avatar.leagueoflegends.com/NA/sdsdfdfs.png" style="width: 100px; height: 100px;">`;
    $($(".riot-fist", obj)[0]).prepend(prependThis);
    $($(".riot-fist", obj)[0]).css("background-image", "url('http://i.imgur.com/BBis2Vu.jpg')", "!important");
  }

  if((typeof (tinyIcon = $(".icon", obj)[0])) == "undefined")
    tinyIcon = $(".userGroupIcon", obj)[0];

  // Pop up for when you hover your mouse over a person's name/avatar (only do this once for the op)
  $(tinyIcon).css("z-index", "1");

  // Modify avatar size here
  var avatarSize = self.data["Avatars"];
  // $(icon).css("width",  avatarSize, "!important");
  // $(icon).css("height", avatarSize, "!important");
  $(icon).css("width",  avatarSize + "px", "!important");
  $(icon).css("height", avatarSize + "px", "!important");
  $(myIcon).css("width", avatarSize + "px", "!important");

  var REEEEEEEE = 0;

  // Do NOT do these if a badge-container already exists
  // if(!$(".badge-container", obj).length){
  if(op){
    // if OP, do #content
    $("#content").css("padding-left", 75 + parseInt(avatarSize) + "px", "!important");
    $("#content").css("min-height",   50 + parseInt(avatarSize) + "px", "!important");
    REEEEEEEE = $("#content")[0];

    // Adjust length of username
    // 100 =>  0.0
    // 125 => 12.5
    // 150 => 25.0
    // 175 => 37.5
    // 200 => 50.0
    // Formula: (avatarSize - 100) / 2
    // $(".username", obj).css("left", parseInt((avatarSize - 100) / 2) + "px", "!important");
  }else{
    // else, do .body    (20 + avatarSize)

    var testingStuff = parseInt(avatarSize);
    if(testingStuff < 144)
      testingStuff = 144;

    // Set width of .profile-hover to testingStuff
    $(".profile-hover", obj).css("width", testingStuff, "!important");

    $(".body", obj).css("padding-left", 20 + testingStuff + "px", "!important");
    $(".body", obj).css("min-height",   avatarSize        + "px", "!important");
    REEEEEEEE = $(".body", obj)[0];
  }
  // }

  // Pop-up thing that appears when you hover over a user
  $(tinyIcon).each(function(){
    $(this).hover(function(){
      var avatar = $($(this).find("img")[0]).attr("src");

      // Now create and append to innerDiv
      innerDiv = document.createElement("div");
      innerDiv.className = "bek-profile-popup";

      innerDiv.innerHTML = `<a href="#" id="prfle" style="color: black; letter-spacing: 0px; font-weight: bold; font-variant: normal; font-family: Spiegel-Regular, sans-serif">View Profile</a><br>
                            <a href="#" id="avatr" style="color: black; letter-spacing: 0px; font-weight: bold; font-variant: normal; font-family: Spiegel-Regular, sans-serif">View Avatar</a><br>
                            <a href="#" id="cname" style="color: black; letter-spacing: 0px; font-weight: bold; font-variant: normal; font-family: Spiegel-Regular, sans-serif">Copy Name</a><br>
                            <a href="#" id="lolnx" style="color: black; letter-spacing: 0px; font-weight: bold; font-variant: normal; font-family: Spiegel-Regular, sans-serif">LoLNexus</a><br>
                            <a href="#" id="opgg"  style="color: black; letter-spacing: 0px; font-weight: bold; font-variant: normal; font-family: Spiegel-Regular, sans-serif">OP.GG</a><br>
                            <a href="#" id="black" style="color: black; letter-spacing: 0px; font-weight: bold; font-variant: normal; font-family: Spiegel-Regular, sans-serif">Blacklist</a>`;

      this.appendChild(innerDiv);

      $(profHover).click(function(event){
        event.preventDefault();
        event.stopPropagation();
      });

      $("#prfle").hover(function() {this.style.setProperty("text-decoration",  "underline");}, function() {this.style.setProperty("text-decoration",  "none");});
      $("#avatr").hover(function() {this.style.setProperty("text-decoration",  "underline");}, function() {this.style.setProperty("text-decoration",  "none");});
      $("#cname").hover(function() {this.style.setProperty("text-decoration",  "underline");}, function() {this.style.setProperty("text-decoration",  "none");});
      $("#lolnx").hover(function() {this.style.setProperty("text-decoration",  "underline");}, function() {this.style.setProperty("text-decoration",  "none");});
      $("#opgg").hover(function()  {this.style.setProperty("text-decoration",  "underline");}, function() {this.style.setProperty("text-decoration",  "none");});
      $("#black").hover(function() {this.style.setProperty("text-decoration",  "underline");}, function() {this.style.setProperty("text-decoration",  "none");});

      $("#prfle").click(function(event){
        event.preventDefault();
        event.stopPropagation();
        var win = window.open("https://boards." + self.platformRegion + ".leagueoflegends.com/en/player/" + regionT + "/" + usernameT, "_blank");
        win.focus();
      });

      $("#avatr").click(function(event){
        event.preventDefault();
        event.stopPropagation();
        var win = window.open(avatar, "_blank");
        win.focus();
      });

      $("#cname").click(function(event){
        event.preventDefault();
        event.stopPropagation();

        var tempElement = document.createElement("div");
        tempElement.textContent = $(this).parent().parent().parent().find(".username").text();
        document.body.appendChild(tempElement);

        if(document.selection){
          var range = document.body.createTextRange();
          range.moveToElementText(tempElement);
          range.select();
        }else if(window.getSelection){
          var range = document.createRange();
          range.selectNode(tempElement);
          window.getSelection().removeAllRanges();
          window.getSelection().addRange(range);
        }

        document.execCommand("copy");
        tempElement.remove();
        innerDiv.remove();
        alert("Name copied");
      });

      $("#lolnx").click(function(event){
        event.preventDefault();
        event.stopPropagation();
        var win = window.open("http://www.lolnexus.com/" + regionT + "/search?name=" + usernameT, "_blank");
        win.focus();
      });

      $("#opgg").click(function(event){
        event.preventDefault();
        event.stopPropagation();
        var win = window.open("http://" + regionT + ".op.gg/summoner/userName=" + usernameT, "_blank");
        win.focus();
      });

      $("#black").click(function(event){
        event.preventDefault();
        event.stopPropagation();
        var target    = usernameT + " (" + regionT + ")";
        var blacklist = self["data"]["blacklist"]
        blacklist[target] = 1;
        Set(self.data, function(){
          alert(target + " has been blacklisted. Refresh the page to update blacklisted users. To unblacklist somebody, open up the control panel by pressing the ~ key and click on the Blacklist tab.");

          // TODO: Update the blacklist if it's the current active tab
        });
      });

      // Fade the BEK popup box in
      $(innerDiv).fadeIn(200);
    }, function(){
      innerDiv.remove();
    });
  });

  // BEK staff have special gradient names, so I need to extract them using this method
  // if(obj.getElementsByClassName("pxg-set").length > 0)
  //   usernameT = inlineProfile.getElementsByClassName("pxg-set")[0].childNodes[0].textContent;

  // If the current user isn't in the BEK database, assign stuff
  if(typeof self.results[usernameT] !== "undefined"){
    // Declare variables that will be used later
    var opTitle;      // op
    var authorInfo;   // op
    var content;      // op
    var controlLinks; // op
    var attachments;  // not op
    var footer;       // not op

    // Define user data variables
    var avatar = self.results[usernameT][regionT].avatar;
    var staff  = self.results[usernameT][regionT].staff;
    var title  = self.results[usernameT][regionT].title;
    var badge  = self.results[usernameT][regionT].badge;

    var innerDiv;

    // Assign avatars
    if(typeof isRioter !== "undefined")
      self.AssignAvatar(obj, true, avatar, tinyIcon);
    else
      self.AssignAvatar(obj, false, avatar, tinyIcon);

    // Alter text colors for names and titles
    // if(op === false){
    //   if(isRioter)
    //     profHover.style.setProperty("color", "#AE250F", "important"); // Makes sure that Rioter's titles are red
    //   else if(staff == "1")
    //     profHover.style.setProperty("color", "#0000FF", "important"); // BEK staff
    //   else
    //     profHover.style.setProperty("color", "#94724D", "important"); // Regular users
    // }

    // Username: All Posts
    if(1){
      if(staff == "1"){
        // Gradient names have problems where if they are too long and have a space, they will
        // go on a second line. So if a name is a certain length (>= 14) and has at least one
        // space in it, decrease the font size to 12
        if(usernameT.length >= 12 && (usernameT.indexOf(" ") >= 0))
          username.style.setProperty("font-size", "12px", "important");

        $(username).GradientText({
          step:    10,
          colors: ["#68BAFF", "#008AFF", "#68BAFF"],
          dir:    "x"
        });
      }
    }
  }

  self.RollDice(body);
  self.GetBadgesAndTitle(usernameT, regionT, myIcon, staff, title, badge, REEEEEEEE);
}

/////////////////////////////////////
// AssignAvatar: Assigns an avatar //
/////////////////////////////////////
BEK.prototype.AssignAvatar = function(obj, isRioter, avatar, tinyIcon){
  if(isRioter){
     if(typeof avatar !== "undefined"){
       if(avatar.slice(-5) == ".webm"){
         FormatWebmAvatar(obj, avatar);
       }else{
         obj.getElementsByTagName("img")[0].setAttribute("src", avatar);
       }
     }
  }else{
    if(typeof avatar !== "undefined"){
      if(avatar.slice(-5) == ".webm")
        FormatWebmAvatar(obj, avatar);
      else
        obj.getElementsByTagName("img")[0].setAttribute("src", avatar);
    }
    // else if(fallbackAvatar != "off")
    //   obj.getElementsByTagName("img")[0].setAttribute("src", fallbackAvatar);
  }
}

////////////////////////////////////////////////////////////////////////
// GetBadgesAndTitle: Gets a user's badges and title using Riot's API //
////////////////////////////////////////////////////////////////////////
BEK.prototype.GetBadgesAndTitle = function(usernameT, regionT, profHover, staff, title, badge, REEEEEEEE){
  var self       = this;
  var avatarSize = self.data["BEK Avatars"];

  $.getJSON("https://boards." + self.platformRegion + ".leagueoflegends.com/api/users/" + regionT + "/" + usernameT + "?include_profile=true", function(api){
    if(!profHover.getElementsByClassName("badge-container")[0] && !profHover.getElementsByClassName("title")[0]){
      var badgeContainer;
      var badgeSize = "36px"; // Badges are 36x36 and 4 badges per line
      badgeContainer = document.createElement("div");
      badgeContainer.className = "badge-container";
      badgeContainer.style.setProperty("min-width",   "144px", "important");
      badgeContainer.style.setProperty("line-height", "0",     "important");
      profHover.appendChild(badgeContainer);

      var data;
      var badges = [];

      if(api.profile){
        data = api.profile.data;

        if(typeof title == "undefined")
          title = data.title;
      }

      if(typeof data !== "undefined"){
        if(data.b_raf)     {badges.push("https://cdn.leagueoflegends.com/apollo/badges/raf.png");}
        if(data.b_s01gold) {badges.push("https://cdn.leagueoflegends.com/apollo/badges/s1gold.png");}
        if(data.b_s01plat) {badges.push("https://cdn.leagueoflegends.com/apollo/badges/s1platinum.png");}

        if(data.b_s02plat) {badges.push("https://cdn.leagueoflegends.com/apollo/badges/s2platinum.png");}
        if(data.b_s02diam) {badges.push("https://cdn.leagueoflegends.com/apollo/badges/s2diamond.png");}

        if(data.b_s03gold) {badges.push("https://cdn.leagueoflegends.com/apollo/badges/s3gold.png");}
        if(data.b_s03plat) {badges.push("https://cdn.leagueoflegends.com/apollo/badges/s3platinum.png");}
        if(data.b_s03diam) {badges.push("https://cdn.leagueoflegends.com/apollo/badges/s3diamond.png");}
        if(data.b_s03chal) {badges.push("https://cdn.leagueoflegends.com/apollo/badges/s3challenger.png");}

        if(data.b_s04gold) {badges.push("https://cdn.leagueoflegends.com/apollo/badges/s4gold.png");}
        if(data.b_s04plat) {badges.push("https://cdn.leagueoflegends.com/apollo/badges/s4platinum.png");}
        if(data.b_s04diam) {badges.push("https://cdn.leagueoflegends.com/apollo/badges/s4diamond.png");}
        if(data.b_s04mast) {badges.push("https://cdn.leagueoflegends.com/apollo/badges/s4master.png");}
        if(data.b_s04chal) {badges.push("https://cdn.leagueoflegends.com/apollo/badges/s4challenger.png");}

        if(data.b_s05gold) {badges.push("https://i.imgur.com/KqTvYEa.png");}
        if(data.b_s05plat) {badges.push("https://i.imgur.com/l9lMtwa.png");}
        if(data.b_s05diam) {badges.push("https://i.imgur.com/A073pTS.png");}
        if(data.b_s05mast) {badges.push("https://i.imgur.com/ur0LOXd.png");}
        if(data.b_s05chal) {badges.push("https://i.imgur.com/ZmmVMrB.png");}

        if(data.b_s06gold) {badges.push("https://cdn.leagueoflegends.com/apollo/badges/s6gold.png");}
        if(data.b_s06plat) {badges.push("https://cdn.leagueoflegends.com/apollo/badges/s6platinum.png");}
        if(data.b_s06diam) {badges.push("https://cdn.leagueoflegends.com/apollo/badges/s6diamond.png");}
        if(data.b_s06mast) {badges.push("https://cdn.leagueoflegends.com/apollo/badges/s6master.png");}
        if(data.b_s06chal) {badges.push("https://cdn.leagueoflegends.com/apollo/badges/s6challenger.png");}
      }

      if(staff == "1")
        badges.push(self.BEKgfx + "fekbadge.png");

      if(badge){
        var collection = badge.split(",");
          for(var i = 0; i < collection.length; i++)
            if(collection[i])
              badges.push(collection[i]);
      }

      var wereThereBadges = false;
      if(badges.length)
        wereThereBadges = true;

      while(badges.length > 0){
        var badgeName = badges.shift();

        var reee = `<span class="badge" style="background-image: url(${badgeName}); display: inline-block; width: ${badgeSize}; height: ${badgeSize};"></span>`;
        $(badgeContainer).append(reee);
      }

      // Check the height of the badge container
      if(wereThereBadges){
        var currentHeight = parseInt($(REEEEEEEE).css("min-height"));
        currentHeight += parseInt($($(badgeContainer)[0]).css("height")); // Increase the min-height by height of badge container
        $(REEEEEEEE).css("min-height", currentHeight + "px", "important")
      }

      // Apply a title if you have one
      if(title){
        var divTitle = document.createElement("div");

        divTitle.className = "title";
        divTitle.textContent = title;parseInt(avatarSize)
        divTitle.style.setProperty("overflow",    "hidden",                                     "important");
        divTitle.style.setProperty("font-family", `"Constantia", "Palatino", "Georgia", serif`, "important");

        profHover.appendChild(divTitle);

        if(title.length < 24)
          divTitle.style.setProperty("font-size", "16px", "important");
        else if(title.length < 28)
          divTitle.style.setProperty("font-size", "15px", "important");
        else
          divTitle.style.setProperty("font-size", "12px", "important");

        if(staff == "1"){
          divTitle.style.setProperty("font-size", "26px", "important");

          $(divTitle).GradientText({
            step: 10,
            colors: ["#68BAFF", "#008AFF", "#68BAFF"],
            dir: "x"
          });

          if(title.length >= 16)
            divTitle.style.setProperty("font-size", "13px", "important");
          else
            divTitle.style.setProperty("font-size", "14px", "important");
        }
      }
    }
  });
}

////////////////////////////////////////////////////////////////////////////////////////////////
// WaitAndRun: Waits for a certain element on the page to load and then executes the callback //
////////////////////////////////////////////////////////////////////////////////////////////////
BEK.prototype.WaitAndRun = function(selector, callback){
  var self        = this;
  var currentTime = 0;    // Default to zero
  var frequency   = 10;   // How often to check in milliseconds
  var timeOut     = 5000; // When this function should give up

  // Check every 10 milliseconds (100 times a second)
  var interval = setInterval(function(){
    currentTime += frequency;

    if(currentTime >= timeOut)
      clearInterval(interval);
    else if($(selector).length > 0){
      clearInterval(interval);
      callback(self);
    }
  }, frequency);
}

//////////////////////////////////////////////////////////////////////////////////////////
// WaitAndRunManual: Waits for a specified amount of time before executing the callback //
//////////////////////////////////////////////////////////////////////////////////////////
BEK.prototype.WaitAndRunManual = function(time, callback){
  var timeOut = time, currentTime = 0;

  var interval = setInterval(function(){
    currentTime = currentTime + 1;

    if(currentTime >= timeOut){
      clearInterval(interval);
      callback();
    }
  }, 1);
}

/////////////////////////////////////////////////////////////
// ColorVotes: Colors upvotes green and downvotes negative //
/////////////////////////////////////////////////////////////
BEK.prototype.ColorVotes = function(self){
  var totalVotes = $(document).find(".total-votes");

  $(totalVotes).each(function(){
    if($(this).html()[0] == "-")
      this.style.setProperty( "color", "#FF5C5C", "important"); // Make red for downvotes
    else if($(this).html()[0] == "•")
      {} // Do nothing
    else if($(this).html() != "0" && $(this).html() != "1")
      this.style.setProperty( "color", "#05E100", "important"); // Make green for upvotes
  });
}

//////////////////////////////////////////////////////////////////////////////////////////////
// HoverVotes: Attaches a hover event to the vote numbers to display their individual votes //
//////////////////////////////////////////////////////////////////////////////////////////////
BEK.prototype.HoverVotes = function(self){
  var votingDisplay = "on"; // SAMPLE TEST SETTING, REMOVE LATER!
  if(votingDisplay != "off"){

    $(".riot-voting").each(function(){
      if(votingDisplay == "hide")
        this.style.setProperty("visibility", "hidden", "important");
      else if(this.hasAttribute("hover-event") === false){
        this.setAttribute("hover-event", "true");
        $(this).hover(function(){
          self.ShowIndividualVotes(self, this);
        }, function(){
          $("#up-down-display").remove();
          $(".total-votes").show();
        });
      }
    });
  }
}

//////////////////////////////////////////////////////////////////////////////////////////
// ShowIndividualVotes: Shows how many upvotes and downvotes a specific thread/post has //
//////////////////////////////////////////////////////////////////////////////////////////
BEK.prototype.ShowIndividualVotes = function(self, obj){
  var votingDisplay = "individual"; // TESTING TEMP DEFAULT VARIABLE, REMOVE LATER!
  var voteFinder    = obj.parentElement;
  var uVotes        = voteFinder.getAttribute("data-apollo-up-votes");
  var dVotes        = voteFinder.getAttribute("data-apollo-down-votes");
  var voteScore     = obj.getElementsByClassName("total-votes")[0];

  var upDownDisplay = document.createElement("li");
  $(upDownDisplay).attr("id", "up-down-display");

  if($(obj).closest(".op-container").length){
    $(upDownDisplay).css("padding", "4px 0px 4px"); // CSS for op's vote
    $(upDownDisplay).css("font-size", "12px");
  }else
    $(upDownDisplay).css("padding", "4px 0px 2px"); // CSS for non-op's vote

  obj.insertBefore(upDownDisplay, obj.children[1]);

  if(votingDisplay == "individual")
    upDownDisplay.innerHTML = `
    <font color="#05E100">${uVotes}</font>
    <font color="white">|</font>
    <font color="#FF5C5C">${dVotes}</font>
    `;
  else if(votingDisplay == "total")
    upDownDisplay.innerHTML = `
    <font color="#FFA500">${(+uVotes + (+dVotes))}</font>
    `;

  $(voteScore).hide();
}

////////////////////////////////////////////////////
// LoadIndex: Loads everything for the Index page //
////////////////////////////////////////////////////
BEK.prototype.LoadIndex = function(self){
  self.WaitAndRun(".riot-voting > .total-votes",      self.ColorVotes);
  self.WaitAndRun(".riot-voting > .total-votes",      self.HoverVotes);
  self.WaitAndRun("#discussion-list .inline-profile", self.HighlightMyThreads);
  self.WaitAndRun("#discussion-list .inline-profile", self.EnhancedThreadPreview);
  self.WaitAndRun("#discussion-list .inline-profile", self.HideSubboards);


  // Blacklist
  $(".discussion-list-item").each(function(){
    var username = $(".username", this).text();
    var realm    = $(".realm",    this).text();

    if(`${username} ${realm}` in self.data["blacklist"])
      $(this).remove();
  });

  return;

  // RemoveThumbnailBackground();
  // self.ColorVotes();
  // self.HoverVotes();

  // if(enhancedThreadPreview == "on")
  //   EnhancedThreadPreview();

  // if(highlightMyThreads != "off")
  //   HighlightMyThreads();

  // self.QueryServer();
}

///////////////////////////////////////////////////////////////////////
// HighlightMyThreads: Highlights your threads as black on the index //
///////////////////////////////////////////////////////////////////////
BEK.prototype.HighlightMyThreads = function(self){
  if(self.data["Highlight My Threads"] == "off")
    return;

  if(self.page == "Index"){
    $(".discussion-list-item").each(function(){
      // We need to avoid any threads that don't have a name to them
      if(this.getElementsByClassName("username")[0]){
        var name = this.getElementsByClassName("username")[0].textContent;

        if(name == self.myName)
          this.style.setProperty("background-color", self.data["Highlight My Threads"], "important");
      }
    });
  }
}

//////////////////////////////////////////////////////////////////////
// MiniChampionIcons: Displays champion icons in the thread preview //
//////////////////////////////////////////////////////////////////////
function MiniChampionIcons(x){
  var start = x.indexOf(":") + 1;
  var end   = x.indexOf("}", start);
  var icon  = "c" + x.substring(start, end);
  return `<img src="${self.cIcons}${icon}.jpg">`;
}

//////////////////////////////////////////////////////////////
// MiniItemIcons: Displays item icons in the thread preview //
//////////////////////////////////////////////////////////////
function MiniItemIcons(x){
  var start = x.indexOf(":") + 1;
  var end   = x.indexOf("}", start);
  var icon  = x.substring(start, end);
  return `<img src="https://ddragon.leagueoflegends.com/cdn/5.21.1/img/item/${icon}.png" width="16px" height="16px">`;
}

////////////////////////////////////////////////////////////////////////////
// MiniSummonerIcons: Displays summoner spell icons in the thread preview //
////////////////////////////////////////////////////////////////////////////
function MiniSummonerIcons(x){
  var start = x.indexOf(":") + 1;
  var end   = x.indexOf("}", start);
  var icon  = x.substring(start, end);

  if(icon ==  1) icon = "-16px 0px";
  if(icon ==  2) icon = "-32px 0px";
  if(icon ==  3) icon = "-64px 0px";
  if(icon ==  4) icon = "-80px 0px";
  if(icon ==  6) icon = "-96px 0px";
  if(icon ==  7) icon = "-112px 0px";
  if(icon == 11) icon = "-32px -16px";
  if(icon == 12) icon = "-48px -16px";
  if(icon == 13) icon = "-128px 0px";
  if(icon == 14) icon = "-48px 0px";
  if(icon == 17) icon = "-144px 0px";
  if(icon == 21) icon = "0px 0px";
  if(icon == 30) icon = "0px -16px";
  if(icon == 31) icon = "-16px -16px";

  if(icon == 32){
    icon = "-128px -32px";
    return `<span style="background-size: 50%; background: transparent url('//ddragon.leagueoflegends.com/cdn/5.21.1/img/sprite/small_spell13.png') no-repeat scroll ${icon}; background-size: 1000%; width: 16px; height: 16px; display: inline-block;"></span>`;
  }

  return `<span style="background-size: 50%; background: transparent url('//ddragon.leagueoflegends.com/cdn/5.21.1/img/sprite/small_spell0.png') no-repeat scroll ${icon}; background-size: 1000%; width: 16px; height: 16px; display: inline-block;"></span>`;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////
// EnhancedThreadPreview: Displays a fancier preview when you hover the mouse over a thread on the index //
///////////////////////////////////////////////////////////////////////////////////////////////////////////
BEK.prototype.EnhancedThreadPreview = function(self){
  if(self["data"]["Enhanced Preview"] == "off")
    return;

  if(self.page == "Index"){
    $(".title-span").each(function(){
      if($(this).attr("title")){
        $(this).attr("ttdata", $(this).attr("title"));

        $(this).parent().parent().parent().mouseenter(function(){
          var replaceThing = $(this).find(".title-span").attr("ttdata").replace(/[\n\r]/g, "<br />").replace(/{{champion:??:.*?}}/g, MiniChampionIcons).replace(/{{item:??:.*?}}/g, MiniItemIcons).replace(/{{summoner:??:.*?}}/g, MiniSummonerIcons);

          $("#bektooltip").html(`
            <div id="ttlabel"> ${$(this).find(".username").text()}  </div>
            <div id="loadtime">${$(this).find(".title-span").text()}</div>
            <p>${replaceThing}</p>
            `);

          $("#bektooltip").css({"opacity" : "1"});
        });

        $(this).parent().parent().parent().mouseleave(function() {$("#bektooltip").css({"opacity":"0"});});
        this.removeAttribute("title");
      }
    });
  }
}

//////////////////////////////////
// RollDice: Rolls virtual dice //
//////////////////////////////////
BEK.prototype.RollDice = function(obj){
  var self = this;

  // PRNG
  !function(a,b,c,d,e,f,g,h,i){function j(a){var b,c=a.length,e=this,f=0,g=e.i=e.j=0,h=e.S=[];for(c||(a=[c++]);d>f;)h[f]=f++;for(f=0;d>f;f++)h[f]=h[g=s&g+a[f%c]+(b=h[f])],h[g]=b;(e.g=function(a){for(var b,c=0,f=e.i,g=e.j,h=e.S;a--;)b=h[f=s&f+1],c=c*d+h[s&(h[f]=h[g=s&g+b])+(h[g]=b)];return e.i=f,e.j=g,c})(d)}function k(a,b){var c,d=[],e=typeof a;if(b&&"object"==e)for(c in a)try{d.push(k(a[c],b-1))}catch(f){}return d.length?d:"string"==e?a:a+"\0"}function l(a,b){for(var c,d=a+"",e=0;e<d.length;)b[s&e]=s&(c^=19*b[s&e])+d.charCodeAt(e++);return n(b)}function m(c){try{return o?n(o.randomBytes(d)):(a.crypto.getRandomValues(c=new Uint8Array(d)),n(c))}catch(e){return[+new Date,a,(c=a.navigator)&&c.plugins,a.screen,n(b)]}}function n(a){return String.fromCharCode.apply(0,a)}var o,p=c.pow(d,e),q=c.pow(2,f),r=2*q,s=d-1,t=c["seed"+i]=function(a,f,g){var h=[];f=1==f?{entropy:!0}:f||{};var o=l(k(f.entropy?[a,n(b)]:null==a?m():a,3),h),s=new j(h);return l(n(s.S),b),(f.pass||g||function(a,b,d){return d?(c[i]=a,b):a})(function(){for(var a=s.g(e),b=p,c=0;q>a;)a=(a+c)*d,b*=d,c=s.g(1);for(;a>=r;)a/=2,b/=2,c>>>=1;return(a+c)/b},o,"global"in f?f.global:this==c)};if(l(c[i](),b),g&&g.exports){g.exports=t;try{o=require("crypto")}catch(u){}}else h&&h.amd&&h(function(){return t})}(this,[],Math,256,6,52,"object"==typeof module&&module,"function"==typeof define&&define,"random");

  var TIME_THING = $(".timeago > span", $(obj).parent())[0];
  var PARE_THING = $("p", $(obj).parent());

  var timeStamp = String($(TIME_THING).attr("title"));
  var seed      = parseInt(timeStamp.substring(timeStamp.length-8, timeStamp.length-5));
  var rolled    = false;

  // DICE ROLLING RULES!
  // Only one roll per post. This is to prevent too many rolls to crash the browser.
  // Don't do rolls in <blockquote>

  // [roll]     = Die Result: 500 (1d1000)
  // [roll:6]   = Die Result: 4 (1d6)
  // [roll:2d6] = Die Result: 7 (1d6)
  // [roll:100] = Die Result: 50 (1d100)

  $(PARE_THING).each(function(){
    // Extract text in between [roll and ]
    var origText = $(this).text();
    var regex   = /\[roll(.*?)\]/gi
    // console.log(this);
    // console.log(this.text);
    // console.log($(this).text());
    var command = regex.exec(origText);

    if(command){
      // Example of the Array command
      // command[0] : "[roll:2d100]"
      // command[1] : "2d100"

      var numbers = command[1].split("d");
      console.log(numbers);

      var result = 0;
      var rolls  = 1;
      var die    = 1000;

      if(numbers.length == 1){
        die = parseInt(numbers[0]);
      }else if(numbers.length == 2){
        rolls = parseInt(numbers[0]);
        die   = parseInt(numbers[1]);
      }

      if(isNaN(rolls)) rolls = 1;
      if(isNaN(die))   die   = 1000;

      for(var j = 0; j < rolls; ++j){
        Math.seedrandom(seed);
        result += Math.ceil(Math.random() * die);
        seed += 1;
      }

      // Replace the text
      var rollResult = `
      <font color="#ff0000">Die Result: </font>
      <font color="#00ff00">${result}</font>
      <font color="#00ffff">(${rolls}d${die})</font>
      `;

      var newText = origText.replace(command[0], rollResult);

      $(this).html(newText);
    }

    // // Example of the Array command
    // // command[0] : "[roll:2d100]"
    // // command[1] : "2d100"

    // if((rolled || rollDice == "off" || (paragraphs[i].parentElement.tagName == "BLOCKQUOTE")) && command !== null)
    //   paragraphs[i].innerHTML = paragraphs[i].innerHTML.replace(command[0], "");
    // else if(rollDice == "on" && command !== null){
    //   var rolls    = 0;
    //   var die      = 0;
    //   var regex    = /([0-9]*)d([0-9]*)/gi
    //   var extended = regex.exec(command[1]);

    //   // Example of the Array extended (assuming it exists)
    //   // extended[0] : "2d100"
    //   // extended[1] : "2"
    //   // extended[2] : "100"

    //   // Check if it's something like 2d100, instead of having a single number
    //   if(extended !== null){
    //     if(extended[1]) rolls = extended[1];
    //     else            rolls = 1;

    //     if(extended[2]) die = extended[2];
    //     else            die = 1;
    //   }else{
    //     var regex  = /([0-9]*)/g
    //     var simple = regex.exec(command[1]);

    //     if(command[1] == simple[1]){
    //       rolls = 1;

    //       if(command[1]) die = command[1];
    //       else           die = 1;
    //     }
    //   }

    //   var result = 0;

    //   // Limit the die rolls and sides to 100
    //   if(rolls > 100) rolls = 100;
    //   if(die   > 100) die   = 100;

    //   // [roll] is a special die roll of 1d1000
    //   if(command[0] == "[roll]"){
    //     rolls = 1;
    //     die   = 1000;
    //   }

    //   if(rolls != 0){
    //     for(var j = 0; j < rolls; ++j){
    //       Math.seedrandom(seed);
    //       result += Math.ceil(Math.random() * die);
    //       seed += 1;
    //     }

    //     // Replace the text
    //     var dieRoll = `
    //     <font color="#ff0000">Die Result: </font>
    //     <font color="#00ff00">${result}</font>
    //     <font color="#00ffff">(${rolls}d${die})</font>
    //     `;
    //     paragraphs[i].innerHTML = paragraphs[i].innerHTML.replace(command[0], dieRoll);

    //     rolled = true;
    //   }
    // }
  });
}

/////////////////////////////////////////////
// ========== BEK CONTROL PANEL ========== //
/////////////////////////////////////////////

////////////////////////////////////////////
// PanelShow: Shows the BEK control panel //
////////////////////////////////////////////
BEK.prototype.PanelShow = function(){
  var self = this;

  if($("#bek-panel").is(":visible")){
    // If the panel is already visible when show is called, do nothing
  }else{
    // Hide all content views to speed up the .show animation
    $(".scroll-region").hide();

    // Show the panels off-screen so that we can perform pre-animation calculations
    $("#bek-panel .col-left").css("left", "-200vw");
    $("#bek-panel .col-right").css("left", "-200vw");

    $("#bek-panel").show(); $("#bek-panel .col-right").show();

    // Get current panel widths
    var colLeftWidth  = $("#bek-panel .col-left").outerWidth();
    var colRightWidth = $("#bek-panel .col-right").outerWidth();

    // Set start points
    $("#bek-panel .col-left").css("left", "-" + colLeftWidth + "px");
    $("#bek-panel .col-right").css("left", "-" + colRightWidth + "px");

    // Animate
    $("#bek-panel .col-left" ).stop().animate({left: "0px"}, 200, function(){
      $("#bek-panel .col-right").css("left","-" + (colRightWidth - colLeftWidth) + "px");
      $( "#bek-panel .col-right" ).stop().animate({left: colLeftWidth + "px"}, 150, function(){
        // Hide all content views to speed up the .show animation
        $(".scroll-region").show();
        self.InitScrollbar(".scroll-region");
      });
    });
  }
}

////////////////////////////////////////////
// PanelHide: Hides the BEK control panel //
////////////////////////////////////////////
BEK.prototype.PanelHide = function(){
  var self = this;

  // Get current panel widths
  var colLeftWidth  = $("#bek-panel .col-left").outerWidth();
  var colRightWidth = $("#bek-panel .col-right").outerWidth();

  // Hide all content views to speed up the .show animation
  $(".scroll-region").hide();

  // Animate
  $("#bek-panel .setting").find("ul").hide();
  $("#bek-panel .col-right" ).stop().animate({left: "-" + (colRightWidth - colLeftWidth) + "px"}, 150, function(){
    $("#bek-panel .col-right").hide();
    $( "#bek-panel .col-left" ).stop().animate({left: "-" + (colLeftWidth) + "px"}, 200, function(){
      $("#bek-panel").hide();
    });
  });
}

////////////////////////////////////////////////
// PanelToggle: Toggles the BEK control panel //
////////////////////////////////////////////////
BEK.prototype.PanelToggle = function(){
  var self = this;

  if($("#bek-panel").is(":visible"))
    self.PanelHide();
  else
    self.PanelShow();
}

/////////////////////////////////////////////////////////////////////////////////
// LoadWebPanel: Loads web panels such as Credits, Announcements, Events, etc. //
/////////////////////////////////////////////////////////////////////////////////
BEK.prototype.LoadWebPanel = function(page, container){
  var self     = this;
  var formData = new FormData();
  formData.append("page", page);

  SendToServer(`${domain}/webpanel`, formData, function(data){
    container.html(data);
    InitScrollbar(".scroll-region");
  });
}

///////////////////////////////////////////////
// InitScrollbar: Initializes the scroll bar //
///////////////////////////////////////////////
BEK.prototype.InitScrollbar = function(element){
  var self     = this;
  var supressx = false;
  var supressy = false;
  var elm;

  // Turn the provided element into an object, whether it was a selector or dom object passed
  elm = $(element);

  // Check for overflow values
  if(!elm.hasOverflowX()) {supressx = true;}
  if(!elm.hasOverflowY()) {supressy = true;}

  // Setup the css
  elm.css("overflow", "hidden");

  // Check if scrollbar exists already. if it does, update it's values
  if(elm.hasClass("ps-container")){
    // Update the scrollbar
    elm.perfectScrollbar("destroy");
    elm.perfectScrollbar({wheelSpeed: 30, useKeyboard: true, minScrollbarLength: 35, suppressScrollY: supressy, suppressScrollX: supressx});
  }else{
    // Create the scrollbar
    elm.perfectScrollbar({wheelSpeed: 30, useKeyboard: true, minScrollbarLength: 35, suppressScrollY: supressy, suppressScrollX: supressx});

    // Register our element's scrollbars to update on resize
    $(window).resize(function(){
      elm.perfectScrollbar("update");
    });
  }

  // Destroy the scrollbar if it isn't needed and remove the class we reference
  if(!elm.hasOverflow()){
    elm.perfectScrollbar("destroy");
    elm.removeClass("ps-container");
  }
}

///////////////////////////////////////////////////////////////////////////
// HideSubboards: Hides the sub-boards that the user doesn't want to see //
///////////////////////////////////////////////////////////////////////////
BEK.prototype.HideSubboards = function(self){
  $(".discussion-list-item").each(function(){

    // Always show pinned threads
    if(!$(this.getElementsByClassName("pin")[0]).length){
      var subboard = this.getElementsByClassName("discussion-footer")[0].getElementsByTagName("a")[1];

      // Only hide the thread if it's from a board that is recognized
      if(typeof subboard !== "undefined"){
        var subboard = this.getElementsByClassName("discussion-footer")[0].getElementsByTagName("a")[1].textContent;
        if(self.data["hiddenBoards"][subboard] == "on")
          $(this).remove();
      }
    }
  });
}

///////////////////////////////////////
// ========== ENTRY POINT ========== //
///////////////////////////////////////
var bek = new BEK();
bek.Initialize();










//////////////////////////////////////////////////////////////////////////////
// EmptyVoteReplacement: Fills things in the gutter on boards with no votes //
//////////////////////////////////////////////////////////////////////////////
function EmptyVoteReplacement(){
  if(emptyVoteReplacement == "banners"){
    $(".inline-profile").each(function(){
      var src           = "https://i.imgur.com/NcHbI1d.png";
      var votingElement = $(this).parent().parent().parent().find(".no-voting");
      $(votingElement).html(`
      <div class="riot-apollo voting">
        <ul class="riot-voting">
          <li class="total-votes">
            <img style="width: auto; max-width: 30px; max-height: 30px;" src="${src}">
          </li>
        </ul>
      </div>
      `);
    });
  }else if(emptyVoteReplacement == "bannersavatars"){
    self.users   = [];
    self.regions = [];

    $(".inline-profile").each(function(){
      var username = this.getElementsByClassName("username")[0].textContent;
      var region   = this.getElementsByClassName("realm")[0].textContent;
          region   = region.substring(1, region.length - 1);

      self.users.push(username);
      self.regions.push(region);
    });

    var formData = new FormData();
    formData.append("users",   self.users);
    formData.append("regions", self.regions);

    SendToServer(`${domain}/GetOnlyAvatars`, formData, function(data){
      $(".inline-profile").each(function(){
        var username = this.getElementsByClassName("username")[0].textContent;
        var region   = this.getElementsByClassName("realm")[0].textContent;
            region   = region.substring(1, region.length - 1);
        var votingElement = $(this).parent().parent().parent().find(".no-voting");
        var avatar = data["records"][username][region].avatar;
        var src;

        if(avatar !== undefined) src = avatar;
        else                     src = "https://i.imgur.com/NcHbI1d.png";

        $(votingElement).html(`
        <div class="riot-apollo voting">
          <ul class="riot-voting">
            <li class="total-votes">
            <img style="width: auto; max-width: 30px; max-height: 30px;" src="${src}"></li>
          </ul>
        </div>
        `);
      });
    });
  }
}

//////////////////////////////////////////////////////////////////////////////
// FavoriteIcons: Changes the champion/spell/item icons in the posting area //
//////////////////////////////////////////////////////////////////////////////
function FavoriteIcons(){
  $(".button.gamedata.champion").each(function(){
    var url = self.BEKgfxLargeChamp + favoriteChampion;
    this.style.setProperty("background-image", `url("${url}.png")`, "important");
    this.style.setProperty("background-position", "-3px -3px", "important");
    this.style.setProperty("background-size", "120% auto", "important");

    if(favoriteIcons == "mouseover")
      SetGrayscaleProperties(this);
  });

  $(".button.gamedata.summoner").each(function(){
    var url = self.BEKgfxLargeSpell + favoriteSpell;
    this.style.setProperty("background-image", `url("${url}.png")`, "important");
    this.style.setProperty("background-position", "-3px -3px", "important");
    this.style.setProperty("background-size", "120% auto", "important");

    if(favoriteIcons == "mouseover")
      SetGrayscaleProperties(this);
  });

  $(".button.gamedata.item").each(function()
  {
    var url = self.BEKgfxLargeItem + favoriteItem;
    this.style.setProperty("background-image", `url("${url}.png")`, "important");
    this.style.setProperty("background-position", "-3px -3px", "important");
    this.style.setProperty("background-size", "120% auto", "important");

    if(favoriteIcons == "mouseover")
      SetGrayscaleProperties(this);
  });
}

///////////////////////////////////////////////////////
// SetGrayscaleProperties: Sets grayscale properties //
///////////////////////////////////////////////////////
function SetGrayscaleProperties(obj){
  obj.style.setProperty("filter", "grayscale(1)", "important");

  $(obj).hover(function(){
    obj.style.setProperty("filter", "grayscale(0)", "important");
  }, function(){
    obj.style.setProperty("filter", "grayscale(1)", "important");
  });
}

//////////////////////////////////////
// ========== LOAD PAGES ========== //
//////////////////////////////////////

/////////////////////////////////////////////////////////////////////
// IndexBlacklist: Hides threads by blacklisted users on the index //
/////////////////////////////////////////////////////////////////////
function IndexBlacklist(){
  $(".discussion-list-item.row").each(function(){
    // Skip threads that have no username (such as Announcements)
    if($(this).find(".username")[0]){
      var usernameT = this.getElementsByClassName("username")[0].textContent;
      var regionT   = this.getElementsByClassName("realm")[0].textContent;

      // If it's a person you blacklisted, hide the thread
      // if(GM_getValue(usernameT + " " + regionT, 0) == 1)
      //   $(this).remove();
    }
  });
}

//////////////////////////////////////////////////////
// LoadThread: Loads everything for the Thread page //
//////////////////////////////////////////////////////
function LoadThread(){
  // This only happens when clicking Show More in Discussion Mode

  return;
  // Remove all "Posting as X" fields
  $(document).find(".bottom-bar.clearfix.box").find(".left").remove();

  // Make sure that the users/regions arrays are empty, since they will have
  // left-over data from when people switch pages in chronological view
  self.users   = [];
  self.regions = [];

  // Get information on every person within the thread
  $(".inline-profile").each(function(){
    var username = this.getElementsByClassName("username")[0].textContent;
    var region   = this.getElementsByClassName("realm")[0].textContent;
        region   = region.substring(1, region.length - 1);

    // BEK staff have special gradient names, so I need to extract them using this method
    if(this.getElementsByClassName("pxg-set").length > 0)
      username = this.getElementsByClassName("pxg-set")[0].childNodes[0].textContent;

    self.users.push(username);
    self.regions.push(region);
  });

  // Bring .toggle-minimized to the front so people can click on it
  $(".toggle-minimized").each(function(){$(this).css("z-index", "1");});

  WaitAndRun(".profile-hover", FormatAllPosts);

  ColorVotes();
  HoverVotes();
  QueryBEKServer();

  if(embedMedia == "on")
    EmbedMedia();
}

////////////////////////////////////////////////////////////////
// FormatSomePosts: Calls FormatSinglePost on only some posts //
////////////////////////////////////////////////////////////////
function FormatSomePosts(BEKData = false){
  if(!BEKData){
    $(".body-container").each(function(){
      FormatSinglePost1(this, false);
    });
  }else{
    $(".body-container").each(function(){
      // Only execute the function if the post is not deleted
      if(!$($(this).find(".deleted")[0]).is(":visible"))
        FormatSinglePost2(this, false);
    });
  }
}

/////////////////////////////////////
// FormatAvatar: Formats an avatar //
/////////////////////////////////////
function FormatAvatar(obj, isRioter, tinyIcon, icon){
  tinyIcon.style.setProperty("position",         "relative",        "important");
  tinyIcon.style.setProperty("top",              "12px",            "important");
  tinyIcon.style.setProperty("left",             "30px",            "important");
  tinyIcon.style.setProperty("width",            avatarSize + "px", "important");
  tinyIcon.style.setProperty("height",           avatarSize + "px", "important");
  tinyIcon.style.setProperty("background-image", "none",            "important");

  if(isRioter){
    if(!tinyIcon.getElementsByTagName("img")[0] && !tinyIcon.getElementsByTagName("video")[0]){
      var imgIcon = document.createElement("img");
      imgIcon.setAttribute("src", "https://i.imgur.com/STcpwlY.png");
      imgIcon.style.setProperty("width",     avatarSize + "px",    "important");
      imgIcon.style.setProperty("height",    avatarSize + "px",    "important");
      imgIcon.style.setProperty("border",    "thin solid #FF0000", "important");
      tinyIcon.appendChild(imgIcon);
    }
  }else{
    icon.style.setProperty("width",  avatarSize + "px",    "important");
    icon.style.setProperty("height", avatarSize + "px",    "important");
    icon.style.setProperty("border", "thin solid #FFFFFF", "important");

    if(fallbackAvatar != "off"){
      obj.getElementsByTagName("img")[0].setAttribute("src", fallbackAvatar);
    }
  }
}

////////////////////////////////////////////////////
// FormatWebmAvatar: Gives the user a webm avatar //
////////////////////////////////////////////////////
function FormatWebmAvatar(obj, avatar){
  // This check ensures no duplicate .webm avatars will be embedded into a user's post
  if(!obj.getElementsByTagName("video")[0]){
    var webm = obj.getElementsByTagName("img")[0];
    webm.setAttribute("src",  avatar, "important");
    webm.setAttribute("loop", "true");
    webm.setAttribute("data-bind", "", "important");
    $(webm).ChangeElementType("video");
    obj.getElementsByTagName("video")[0].play();
  }
}

/////////////////////////////////////////
// Extend jQuery for BEK control panel //
/////////////////////////////////////////
$.fn.hasOverflow = function(){
  var leeway = 0;
  var element = $(this)[0];
  if(element.clientWidth < (element.scrollWidth - leeway) || element.clientHeight < (element.scrollHeight - leeway))
    return true;

  return false;
};

$.fn.hasOverflowX = function(){
  var leeway = 0;
  var element = $(this)[0];
  if(element.offsetWidth < (element.scrollWidth - leeway)){
    $(this).attr("overflowX", (element.scrollWidth - leeway) - element.offsetWidth);
    return true;
  }else{
    $(this).attr("overflowX", "0");
    return false;
  }
};

$.fn.hasOverflowY = function(){
  var leeway = 0;
  var element = $(this)[0];
  if(element.offsetHeight < (element.scrollHeight - leeway)){
    $(this).attr("overflowY", (element.scrollHeight - leeway) - element.offsetHeight);
    return true;
  }else{
    $(this).attr("overflowY", "0");
    return false;
  }
};

/////////////////////////////////////
// ========== UTILITIES ========== //
/////////////////////////////////////

///////////////////////////////////////////////////
// ChangeElementType: Changes the element's type //
///////////////////////////////////////////////////
(function($) {$.fn.ChangeElementType = function(newType) {var attrs = {}; $.each(this[0].attributes, function(idx, attr) {attrs[attr.nodeName] = attr.nodeValue;}); this.replaceWith(function() {return $("<" + newType + "/>", attrs).append($(this).contents());});};})(jQuery);

//////////////////////////////////////////////////
// GradientText: Gives a color gradient to text //
//////////////////////////////////////////////////
(function(e){e("head").append('<style type="text/css">.sn-pxg .pxg-set{user-select:none;-moz-user-select:none;-webkit-user-select:none;}.sn-pxg span.pxg-source{position:relative;display:inline-block;z-index:2;}.sn-pxg U.pxg-set,.sn-pxg U.pxg-set S,.sn-pxg U.pxg-set S B{left:0;right:0;top:0;bottom:0;height:inherit;width:inherit;position:absolute;display:inline-block;text-decoration:none;font-weight:inherit;}.sn-pxg U.pxg-set S{overflow:hidden;}.sn-pxg U.pxg-set{text-decoration:none;z-index:1;display:inline-block;position:relative;}</style>');e.fn.GradientText=function(t){function r(e){if("#"==e.substr(0,1)){e=e.substr(1)}if(3==e.length){e=e.substr(0,1)+e.substr(0,1)+e.substr(1,1)+e.substr(1,1)+e.substr(2,1)+e.substr(2,1)}return[parseInt(e.substr(0,2),16),parseInt(e.substr(2,2),16),parseInt(e.substr(4,2),16)]}function i(e){var t="0123456789abcdef";return"#"+t.charAt(parseInt(e[0]/16))+t.charAt(e[0]%16)+t.charAt(parseInt(e[1]/16))+t.charAt(e[1]%16)+t.charAt(parseInt(e[2]/16))+t.charAt(e[2]%16)}function s(e,n){var r=e>0?e/n:0;for(var i=0;i<t.colors.length;i++){fStopPosition=i/(t.colors.length-1);fLastPosition=i>0?(i-1)/(t.colors.length-1):0;if(r==fStopPosition){return t.colors[i]}else if(r<fStopPosition){fCurrentStop=(r-fLastPosition)/(fStopPosition-fLastPosition);return o(t.RGBcolors[i-1],t.RGBcolors[i],fCurrentStop)}}return t.colors[t.colors.length-1]}function o(e,t,n){var r=[];for(var s=0;s<3;s++){r[s]=e[s]+Math.round((t[s]-e[s])*n)}return i(r)}var t=e.extend({step:10,colors:["#ffcc00","#cc0000","#000000"],dir:"y"},t);t.RGBcolors=[];for(var n=0;n<t.colors.length;n++){t.RGBcolors[n]=r(t.colors[n])}return this.each(function(n,r){var i=e(r);if(!i.hasClass("sn-pxg")){var o=i.html();i.html('<span class="pxg-source" style="visibility: hidden;">'+o+"</span>").append('<u class="pxg-set"></u>');var u=i.find(".pxg-set");var a=i.find(".pxg-source");var f=a.innerWidth();var l=a.innerHeight();a.hide();i.addClass("sn-pxg");if(t.dir=="x"){var c=f}else if(t.dir=="y"){var c=l}var h=Math.floor(c/t.step);var p=h;var d=c-h*t.step;if(d>0){p++}u.css({width:f,height:l});var v=0;var m="";if(t.dir=="x"){for(var n=0;n<p;n++){var g=s(v,c);m+='<s style="height:'+l+"px;width:"+t.step+"px;left:"+v+"px;color:"+g+'"><b style="left:-'+v+"px;width:"+f+"px;height:"+l+'px;">'+o+"</b></s>";v=v+t.step}}else if(t.dir=="y"){for(var n=0;n<p;n++){var g=s(v,c);m+='<s style="width:'+f+"px;height:"+t.step+"px;top:"+v+"px;color:"+g+'"><b style="top:-'+v+"px;height:"+f+"px;height:"+l+'px;">'+o+"</b></s>";v=v+t.step}}u.append(m)}})}})(jQuery);

///////////////////////////////////////////////////////////////////
// CreateAlertBox: Creates an alert box at the top of the window //
///////////////////////////////////////////////////////////////////
function CreateAlertBox(top, background, border, color, innerHTML){
  var apolloHeader = document.getElementsByClassName("apollo-header")[0];
  var alertBanner = document.createElement("div");
  apolloHeader.appendChild(alertBanner);

  alertBanner.style.setProperty("position",              "absolute");
  alertBanner.style.setProperty("top",                   top);
  alertBanner.style.setProperty("left",                  "50%");
  alertBanner.style.setProperty("width",                 "600px");
  alertBanner.style.setProperty("margin-left",           "-300px");
  alertBanner.style.setProperty("padding",               "10px");
  alertBanner.style.setProperty("background",            background);
  alertBanner.style.setProperty("border",                "2px solid " + border);
  alertBanner.style.setProperty("color",                 color);
  alertBanner.style.setProperty("-webkit-border-radius", "4px");
  alertBanner.style.setProperty("-moz-border-radius",    "4px");
  alertBanner.style.setProperty("border-radius",         "4px");
  alertBanner.style.setProperty("-webkit-box-shadow",    "0px 0px 5px rgba(0, 0, 0, 0.9)");
  alertBanner.style.setProperty("-moz-box-shadow",       "0px 0px 5px rgba(0, 0, 0, 0.9)");
  alertBanner.style.setProperty("box-shadow",            "0px 0px 5px rgba(0, 0, 0, 0.9)");
  alertBanner.style.setProperty("text-shadow",           "1px 1px rgba(0,0,0,.8)");

  alertBanner.innerHTML = innerHTML;
  self.alertPopUp = true;
}

///////////////////////////////////////////////
// ParseTwitterDate: Parses the Twitter date //
///////////////////////////////////////////////
function ParseTwitterDate(text){
  var newtext = text.replace(/(\+\S+) (.*)/, "$2 $1");
  var date = new Date(Date.parse(text)).toLocaleDateString();
  var time = new Date(Date.parse(text)).toLocaleTimeString();

  // Remove the seconds from the timestamp
  var i = time.lastIndexOf(":");
  time = time.slice(0, i) + time.slice(i+3, time.length);

  return date + " - " + time;
}

///////////////////////////////////////////////////////////////////////
// ReplaceUrlWithHtmlLink: Replaces URLs with HTML links for twitter //
///////////////////////////////////////////////////////////////////////
function ReplaceUrlWithHtmlLink(text){
  var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/i;
  return text.replace(exp, `<a href="$1" target="_blank">$1</a>`);
}

////////////////////////////////////////
// ========== BEK FEATURES ========== //
////////////////////////////////////////

///////////////////////////////////////////////////////////
// EmbedMedia: Replaces all webm links with actual webms //
///////////////////////////////////////////////////////////
function EmbedMedia(){
  var links = document.links;
  for(var i = 0; i < links.length; ++i){
    if(links[i].href.slice(-5) == ".webm"){
      var obj = document.getElementsByTagName("a");

      for(var j = 0; j < obj.length; ++j){
        if(links[i].href === obj[j].href){
          obj[j].innerHTML = "";                         // Remove the url since it's not needed
          var webm = document.createElement("video");    // Create the webm element
          webm.setAttribute("width", "500");             // Define the width
          webm.setAttribute("controls", "");             // Create the controls
          var source = document.createElement("source"); // Create the source element
          source.setAttribute("src", links[i].href);     // Set the source
          webm.appendChild(source);                      // Attach the source onto the webm
          obj[j].insertBefore(webm, obj[j].children[0]); // Insert the final result into the post

          // It is imperative to change the .webm's parent from an <a> to a <div>
          $(obj[j]).ChangeElementType("div");
          //obj[j].href = "#";

          // We are done with this loop now
          j = obj.length;
        }
      }
    }
  }

  // YouTube videos do not load immediately, so I have to wait a little bit
  // Redo this and make it use WaitAndRun instead, because I'm going to delete WaitAndRunManual
  // WaitAndRunManual(500, EmbedYouTube);
}

function EmbedYouTube(){
  // Get all of the YouTube objects
  var youtubeObj = document.getElementsByClassName("video-thumb-link");
  var youtubeObjLength = youtubeObj.length;

  for(i = 0; i < youtubeObjLength; i++){
    var regex = /ytimg.com%2Fvi%2F(.*?)%2F/g;

    // Extract the Youtube's video Id
    var youtubeId = regex.exec(youtubeObj[0].innerHTML)[1];

    // Create the new embedded YouTube video in the object's parent
    $($(youtubeObj[0]).parent()).append(`
    <iframe width="533" height="300" src="https://www.youtube.com/embed/${youtubeId}" frameborder="0" allowfullscreen></iframe>
    `);

    // Remove the old object since it's useless
    $(youtubeObj[0]).remove();
  }
}

////////////////////////////////////////////////////////////////////////////////////
// RemoveThumbnailBackground: Removes the background from thumbnails on the index //
////////////////////////////////////////////////////////////////////////////////////
function RemoveThumbnailBackground(){
  // Remove the background image from every thumbnail
  $(".thumbnail-fallback").each(function(){
    this.style.setProperty("background-image", "none", "important");
  });

  // animateThumbnails option
  if(animateThumbnails == "animate"){
    $(document.getElementsByTagName("img")).each(function(){
      var thumbnail = this.getAttribute("src");

      if(thumbnail.slice(-14) == "&animate=false")
        this.setAttribute("src", thumbnail.slice(0, thumbnail.length - 14) + "&animate=true");
    });
  }else if(animateThumbnails == "hide"){
    $(".discussion-list-item td.thumbnail").css("max-width", "0px");
    $(document.getElementsByClassName("thumbnail-fallback")).each(function(){
      $(this).remove();
    });
  }
}

//////////////////////////////////////////////////////////////////////
// AddToNavBar: Adds a completely new element to the navigation bar //
//////////////////////////////////////////////////////////////////////
function AddToNavBar(obj, cName, html, navBar, index)
{
  obj.className = cName;
  obj.innerHTML = html;
  navBar.insertBefore(obj, navBar.children[index]);
}

//////////////////////////////////////////////////////////////////////////////////////////////////
// CreateNavBarGroup: Makes a container in the navigation bar to hold buttons for dropdown list //
//////////////////////////////////////////////////////////////////////////////////////////////////
function CreateNavBarGroup(obj, idName, navBar, index, width, height, lineHeight, backgroundSize){
  navBar.children[index].appendChild(obj);
  obj.id = idName;
  obj.style.setProperty("position",        "absolute");
  obj.style.setProperty("width",           width);
  obj.style.setProperty("height",          height);
  obj.style.setProperty("line-height",     lineHeight);
  obj.style.setProperty("background-size", backgroundSize);
  obj.style.setProperty("background-image", `url("https://cdn.leagueoflegends.com/riotbar/prod/1.5.2/images/bar/bg-bar.jpg?1435084967")`);
}

//////////////////////////////////////////////////////////////////////////////////
// CreateNavBarButton: Creates buttons within a container for the dropdown list //
//////////////////////////////////////////////////////////////////////////////////
function CreateNavBarButton(navGroup, obj, text, url){
  navGroup.appendChild(obj);
  obj.textContent = text;
  obj.href        = url;
  obj.className   = "link";
  obj.onmousedown = function ClickOnLink(){this.style.setProperty("color", "#FFFFFF");};
  obj.style.setProperty("color", "#CFBA6B");
  obj.style.setProperty("height", "30px");
}

//////////////////////////////////////////////////////////////
// CreateNavListLink: Creates a link in the navigation list //
//////////////////////////////////////////////////////////////
function CreateNavListLink(text, url){
  var navList   = document.getElementById("markdown-nav").getElementsByTagName("p")[1];
  var lineBreak = document.createElement("br");
  var anchor    = document.createElement("a");

  anchor.textContent = text;
  anchor.href        = url;

  navList.insertBefore(lineBreak, navList.children[navList.childElementCount]);
  navList.insertBefore(anchor, navList.children[navList.childElementCount]);
}

function RemoveNavListLinks(){
  var navList = document.getElementById("markdown-nav").getElementsByTagName("p")[1];

  for(var text in hide){
    for(var i = 0; i < navList.children.length; ++i){
      if(navList.children[i].textContent == text && hide[text] == "on"){
        // Remove the <br> after the navLink, if it exists
        if(navList.children[i].nextSibling)
          navList.children[i].nextSibling.remove();

        // Remove the <a href> link
        navList.children[i].remove();
      }
    }
  }
}

////////////////////////////////////////////////////////////////////////////
// AddBoardsNavBarNA: Adds a Boards dropdown to the navigation bar for NA //
////////////////////////////////////////////////////////////////////////////
function AddBoardsNavBarNA(){
  var BoardsNavBarGroup        = document.createElement("li"); CreateNavBarGroup(BoardsNavBarGroup, "BoardsNavBarGroup", self.riotBar, 3, "250px", "480px", "27px", "100% 30px");

  var Gameplay                 = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, Gameplay,                 "Gameplay",                     "https://boards.na.leagueoflegends.com/en/c/gameplay-balance");
  var StoryArtSound            = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, StoryArtSound,            "Story, Art, & Sound",          "https://boards.na.leagueoflegends.com/en/c/story-art");
  var Esports                  = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, Esports,                  "Esports",                      "https://boards.na.leagueoflegends.com/en/c/esports");
  var TeamRecruitment          = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, TeamRecruitment,          "Team Recruitment",             "https://boards.na.leagueoflegends.com/en/c/team-recruitment");
  var ConceptsCreations        = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, ConceptsCreations,        "Concepts & Creations",         "https://boards.na.leagueoflegends.com/en/c/skin-champion-concepts");
  var PlayerBehaviorModeration = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, PlayerBehaviorModeration, "Player Behavior & Moderation", "https://boards.na.leagueoflegends.com/en/c/player-behavior-moderation");
  var Miscellaneous            = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, Miscellaneous,            "Miscellaneous",                "https://boards.na.leagueoflegends.com/en/c/miscellaneous");
  var MemesGames               = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, MemesGames,               "Memes & Games",                "https://boards.na.leagueoflegends.com/en/c/memes");
  var Roleplay                 = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, Roleplay,                 "Roleplay",                     "https://boards.na.leagueoflegends.com/en/c/roleplaying");
  var GeneralDiscussion        = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, GeneralDiscussion,        "General Discussion",           "https://boards.na.leagueoflegends.com/en/f/mNBeEEkI");
  var DevCorner                = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, DevCorner,                "Dev Corner",                   "https://boards.na.leagueoflegends.com/en/c/developer-corner");
  var RedTracker               = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, RedTracker,               "Red Tracker",                  "https://boards.na.leagueoflegends.com/en/redtracker");
  var HelpSupport              = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, HelpSupport,              "Help & Support",               "https://boards.na.leagueoflegends.com/en/f/osqw6G4M");
  var ReportBug                = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, ReportBug,                "Report a Bug",                 "https://boards.na.leagueoflegends.com/en/c/bug-report");
  var BoardsFeedback           = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, BoardsFeedback,           "Boards Feedback",              "https://boards.na.leagueoflegends.com/en/c/site-feedback");
  var ServiceStatus            = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, ServiceStatus,            "Service Status",               "https://status.leagueoflegends.com/?en_US#na");
}

/////////////////////////////////////////////////////////////////////////////
// AddBoardsNavBarNA: Adds a Boards dropdown to the navigation bar for OCE //
/////////////////////////////////////////////////////////////////////////////
function AddBoardsNavBarOCE(){
  var BoardsNavBarGroup     = document.createElement("li"); CreateNavBarGroup(BoardsNavBarGroup, "BoardsNavBarGroup", self.riotBar, 3, "225px", "300px", "27px", "100% 30px");
  var RedTracker            = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, RedTracker,            "Red Tracker",               "https://boards.oce.leagueoflegends.com/en/redtracker");
  var Miscellaneous         = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, Miscellaneous,         "Miscellaneous",             "https://boards.oce.leagueoflegends.com/en/c/miscellaneous");
  var PlayerCreations       = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, PlayerCreations,       "Player Creations",          "https://boards.oce.leagueoflegends.com/en/c/player-creations");
  var GameplayStrategy      = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, GameplayStrategy,      "Gameplay & Strategy",       "https://boards.oce.leagueoflegends.com/en/c/gameplay-strategy");
  var Announcements         = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, Announcements,         "Announcements",             "https://boards.oce.leagueoflegends.com/en/c/announcements");
  var TheNewsHour           = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, TheNewsHour,           "The News Hour",             "https://boards.oce.leagueoflegends.com/en/c/the-news-hour");
  var TeamRecruitment       = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, TeamRecruitment,       "Team Recruitment",          "https://boards.oce.leagueoflegends.com/en/c/team-recruitment");
  var Esports               = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, Esports,               "Esports",                   "https://boards.oce.leagueoflegends.com/en/c/esports");
  var HelpSupport           = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, HelpSupport,           "Help & Support",            "https://boards.oce.leagueoflegends.com/en/f/ElA0rvVL");
  var ServiceStatus         = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, ServiceStatus,         "Service Status",            "https://status.leagueoflegends.com/?en_US#na");
}

//////////////////////////////////////////////////////////////////////////////
// AddBoardsNavBarEUW: Adds a Boards dropdown to the navigation bar for EUW //
//////////////////////////////////////////////////////////////////////////////
function AddBoardsNavBarEUW(){
  var BoardsNavBarGroup     = document.createElement("li"); CreateNavBarGroup(BoardsNavBarGroup, "BoardsNavBarGroup", self.riotBar, 3, "225px", "480px", "27px", "100% 30px");
  var RedTracker            = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, RedTracker,            "Red Tracker",               "https://boards.eune.leagueoflegends.com/en/redtracker");
  var Announcements         = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, Announcements,         "Announcements",             "https://boards.euw.leagueoflegends.com/en/c/announcements-en");
  var CommunityCreations    = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, CommunityCreations,    "Community Creations",       "https://boards.euw.leagueoflegends.com/en/c/community-creations-en");
  var CommunityEvents       = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, CommunityEvents,       "Community Events",          "https://events.euw.leagueoflegends.com/");
  var StreamsVideos         = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, StreamsVideos,         "Streams & Videos",          "https://boards.euw.leagueoflegends.com/en/c/streams-videos-en");
  var EventsTournaments     = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, EventsTournaments,     "Events & Tournaments",      "https://boards.euw.leagueoflegends.com/en/c/events-tournaments-en");
  var Esports               = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, Esports,               "Esports",                   "https://boards.euw.leagueoflegends.com/en/c/esports-en");
  var ChampionsGameplay     = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, ChampionsGameplay,     "Champions & Gameplay",      "https://boards.euw.leagueoflegends.com/en/c/champions-gameplay-en");
  var MapsModes             = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, MapsModes,             "Maps & Modes",              "https://boards.euw.leagueoflegends.com/en/c/maps-modes-en");
  var TeamRecruitment       = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, TeamRecruitment,       "Team Recruitment",          "https://boards.euw.leagueoflegends.com/en/c/team-recruitment-en");
  var PlayerBehaviour       = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, PlayerBehaviour,       "Player Behaviour",          "https://boards.euw.leagueoflegends.com/en/c/player-behaviour-en");
  var ForumGamesContests    = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, ForumGamesContests,    "Forum Games & Contests",    "https://boards.euw.leagueoflegends.com/en/c/forum-games-contests-en");
  var SuggestionsBugReports = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, SuggestionsBugReports, "Suggestions & Bug Reports", "https://boards.euw.leagueoflegends.com/en/c/suggestions-bug-reports-en");
  var OffTopic              = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, OffTopic,              "Off Topic",                 "https://boards.euw.leagueoflegends.com/en/c/off-topic-en");
  var HelpSupport           = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, HelpSupport,           "Help & Support",            "https://boards.euw.leagueoflegends.com/en/c/help-support-en");
  var ServiceStatus         = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, ServiceStatus,         "Service Status",            "https://status.leagueoflegends.com/?en_GB#euw");
}

////////////////////////////////////////////////////////////////////////////////
// AddBoardsNavBarEUNE: Adds a Boards dropdown to the navigation bar for EUNE //
////////////////////////////////////////////////////////////////////////////////
function AddBoardsNavBarEUNE(){
  var BoardsNavBarGroup     = document.createElement("li"); CreateNavBarGroup(BoardsNavBarGroup, "BoardsNavBarGroup", self.riotBar, 3, "225px", "480px", "27px", "100% 30px");
  var RedTracker            = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, RedTracker,            "Red Tracker",               "https://boards.eune.leagueoflegends.com/en/redtracker");
  var Announcements         = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, Announcements,         "Announcements",             "https://boards.eune.leagueoflegends.com/en/c/announcements-en");
  var CommunityCreations    = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, CommunityCreations,    "Community Creations",       "https://boards.eune.leagueoflegends.com/en/c/community-creations-en");
  var CommunityEvents       = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, CommunityEvents,       "Community Events",          "https://events.eune.leagueoflegends.com/");
  var StreamsVideos         = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, StreamsVideos,         "Streams & Videos",          "https://boards.eune.leagueoflegends.com/en/c/streams-videos-en");
  var EventsTournaments     = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, EventsTournaments,     "Events & Tournaments",      "https://boards.eune.leagueoflegends.com/en/c/events-tournaments-en");
  var Esports               = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, Esports,               "Esports",                   "https://boards.eune.leagueoflegends.com/en/c/esports-en");
  var ChampionsGameplay     = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, ChampionsGameplay,     "Champions & Gameplay",      "https://boards.eune.leagueoflegends.com/en/c/champions-gameplay-en");
  var MapsModes             = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, MapsModes,             "Maps & Modes",              "https://boards.eune.leagueoflegends.com/en/c/maps-modes-en");
  var TeamRecruitment       = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, TeamRecruitment,       "Team Recruitment",          "https://boards.eune.leagueoflegends.com/en/c/team-recruitment-en");
  var PlayerBehaviour       = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, PlayerBehaviour,       "Player Behaviour",          "https://boards.eune.leagueoflegends.com/en/c/player-behaviour-en");
  var ForumGamesContests    = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, ForumGamesContests,    "Forum Games & Contests",    "https://boards.eune.leagueoflegends.com/en/c/forum-games-contests-en");
  var SuggestionsBugReports = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, SuggestionsBugReports, "Suggestions & Bug Reports", "https://boards.eune.leagueoflegends.com/en/c/suggestions-bug-reports-en");
  var OffTopic              = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, OffTopic,              "Off Topic",                 "https://boards.eune.leagueoflegends.com/en/c/off-topic-en");
  var HelpSupport           = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, HelpSupport,           "Help & Support",            "https://boards.eune.leagueoflegends.com/en/c/help-support-en");
  var ServiceStatus         = document.createElement("a");  CreateNavBarButton(BoardsNavBarGroup, ServiceStatus,         "Service Status",            "https://status.leagueoflegends.com/?en_GB#eune");
}

///////////////////////////////////////////////////////////////////
// AddBoardsNavBar: Adds a Boards dropdown to the navigation bar //
///////////////////////////////////////////////////////////////////
function AddBoardsNavBar(){
  if     (self.platformRegion == "na")   AddBoardsNavBarNA();
  else if(self.platformRegion == "oce")  AddBoardsNavBarOCE();
  else if(self.platformRegion == "euw")  AddBoardsNavBarEUW();
  else if(self.platformRegion == "eune") AddBoardsNavBarEUNE();
}

///////////////////////////////////////////////////////////////////////////////////////
// RoleplayingAlert: Creates a banner in the Roleplaying boards to notify newcomers. //
///////////////////////////////////////////////////////////////////////////////////////
/*
  function RoleplayingAlert(){
    CreateAlertBox("6px", "#003562", "#0000FF", "#FFFFFF",
                   `Hello and welcome to the Roleplaying Boards! Before diving in, we ask that you familiarize yourself with the
                   <a href="https://boards.na.leagueoflegends.com/en/c/roleplaying/L4KZzEqE-community-rules-culture-and-etiquette" style="color:#00C0FF;">Community Rules</a>,
                   and afterwards the <a href="https://boards.na.leagueoflegends.com/en/c/roleplaying/ghd7259r-guide-for-newcomers" style="color:#00C0FF;">Guide for Newcomers</a>.
                   Another helpful thread is <a href="https://boards.na.leagueoflegends.com/en/c/roleplaying/LtW6jJgO-how-to-join-rps-and-not-get-yelled-at" style="color:#00C0FF;">How To Join RPs</a>.
                   Please check <a href="https://boards.na.leagueoflegends.com/en/c/roleplaying/V0JcVrj0-the-ask-champion-compendium" style="color:#00C0FF;">The Ask Champion Compendium</a> for
                   availability and details on how to play as a champion. Once you have visited these threads,
                   this notification will automatically disappear. Thank you, and enjoy your stay!`);

    var url = window.location.href;
    if(url == "https://boards.na.leagueoflegends.com/en/c/roleplaying/L4KZzEqE-community-rules-culture-and-etiquette"){
      if(self.RPint === 0 || self.RPint == 2 || self.RPint == 4 || self.RPint == 6 || self.RPint == 8 || self.RPint == 10 || self.RPint == 12 || self.RPint == 14){
        self.RPint = self.RPint + 1;
        GM_setValue("_RP", self.RPint);
        if(self.RPint == 15)
          alertBanner.remove();
      }
    }else if(url == "https://boards.na.leagueoflegends.com/en/c/roleplaying/ghd7259r-guide-for-newcomers"){
      if(self.RPint === 0 || self.RPint == 1 || self.RPint == 4 || self.RPint == 5 || self.RPint == 8 || self.RPint == 9 || self.RPint == 12 || self.RPint == 13){
        self.RPint = self.RPint + 2;
        GM_setValue("_RP", self.RPint);
        if(self.RPint == 15)
          alertBanner.remove();
      }
    }else if(url == "https://boards.na.leagueoflegends.com/en/c/roleplaying/LtW6jJgO-how-to-join-rps-and-not-get-yelled-at"){
      if(self.RPint === 0 || self.RPint == 1 || self.RPint == 2 || self.RPint == 3 || self.RPint == 8 || self.RPint == 9 || self.RPint == 10 || self.RPint == 11){
        self.RPint = self.RPint + 4;
        GM_setValue("_RP", self.RPint);
        if(self.RPint == 15)
          alertBanner.remove();
      }
    }else if(url == "https://boards.na.leagueoflegends.com/en/c/roleplaying/V0JcVrj0-the-ask-champion-compendium"){
      if(self.RPint === 0 || self.RPint == 1 || self.RPint == 2 || self.RPint == 3 || self.RPint == 4 || self.RPint == 5 || self.RPint == 6 || self.RPint == 7){
        self.RPint = self.RPint + 8;
        GM_setValue("_RP", self.RPint);
        if(self.RPint == 15)
          alertBanner.remove();
      }
    }
  }
*/

////////////////////////////////////////
// ========== CLICK EVENTS ========== //
////////////////////////////////////////

/////////////////////////////////////////////
// When "Show More" is clicked on an index //
/////////////////////////////////////////////
$(".box.show-more").click(function(event){
  var timeOut = 2000, currentTime = 0;

  var oldLength = $("#discussion-list")[0].children.length;

  var interval = setInterval(function(){
    currentTime++;

    if(currentTime >= timeOut)
      clearInterval(interval);
    else{
      if(oldLength != $("#discussion-list")[0].children.length){
        clearInterval(interval);
        HideSubboards();
        if(self.page == "Index" && emptyVoteReplacement != "off") EmptyVoteReplacement();
      }
    }
  }, 1);
});

////////////////////////////////////////////////
// AddPagingRight: Inefficient... merge later //
////////////////////////////////////////////////
function AddPagingRight(){
  var currentPostCount = 0;
  $(".body-container.clearfix").each(function(){
    ++currentPostCount;
  });

  var timeOut = 5000, currentTime = 0;

  var interval = setInterval(function(){
    currentTime = currentTime + 1;

    if(currentTime >= timeOut)
      clearInterval(interval);
    else{
      var newPostCount = 0;
      $(".body-container.clearfix").each(function(){
        ++newPostCount;
      });

      // console.log("Checking: " + newPostCount);

      if(currentPostCount != newPostCount){
        clearInterval(interval);
        LoadThread();
        AddPagingRight();
      }
    }
  }, 1);
}

/////////////////////////////////////////////////////////////////////////
// When "Show More" is clicked on Discussion View Threads within posts //
/////////////////////////////////////////////////////////////////////////
$(".paging.right").click(function(event){
  var currentPostCount = 0;
  $(".body-container.clearfix").each(function(){
    ++currentPostCount;
  });

  var timeOut = 5000, currentTime = 0;

  var interval = setInterval(function(){
    currentTime = currentTime + 1;

    if(currentTime >= timeOut)
      clearInterval(interval);
    else{
      var newPostCount = 0;
      $(".body-container.clearfix").each(function(){
        ++newPostCount;
      });

      // console.log("Checking: " + newPostCount);

      if(currentPostCount != newPostCount){
        clearInterval(interval);
        LoadThread();
        AddPagingRight();
      }
    }
  }, 1);
});

//////////////////////////////////////
// Toggles the BEK panel on and off //
//////////////////////////////////////
$("#BEKPanel").click(function(event){
  event.preventDefault();
  event.stopPropagation();
  PanelToggle();
});

////////////////////////////////////////////////////////////////////////////
// When Quote or Reply is clicked, change the old icons to favorite icons //
////////////////////////////////////////////////////////////////////////////
$(".toggle-reply-form").click(function(event){
  FavoriteIcons();
});

////////////////////////////////////////
// ========== HOVER EVENTS ========== //
////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////////
// Hides the dropdown menu for Boards and BEK by default, and displays them with mouse hover //
///////////////////////////////////////////////////////////////////////////////////////////////
$("#BoardsNavBarGroup").hide(); $("#BEKNavBarGroup").hide();
$(".touchpoint-boards").hover(function() {$("#BoardsNavBarGroup").show();}, function(){$("#BoardsNavBarGroup").hide();});
$(".touchpoint-bek").hover(function()    {$("#BEKNavBarGroup").show();},    function() {$("#BEKNavBarGroup").hide();});

//////////////////////////////////////////////////////////////////
// Changes the color of a link when you mouse over/away from it //
//////////////////////////////////////////////////////////////////
$(".link").hover(function(){
  this.style.setProperty("color", "#D3C7A9");
}, function(){
  this.style.setProperty("color", "#CFBA6B");
});
