const uiWidth = 500;

var vapp = new Vue({
    el: '#root',
    data: {       
        options: {
            showId: true,
            showSize: true,
            showAnimalName: true,
            showAnimalImage: true,
            showProcessTimer: true,
            showLog: true      
        },
        chartObject: null,
        additionMode: 'firstFit',
        virtualMemory: 200,           
        capacity: 100,
        pageSize: 30,
        frameCount: 10,
        allocation: 100,
        memRange: 20,
        pageSizeRandom: false,
        rate: 1000,
        memStatusBar: '0%',
        cycleRate: 500,
        cycleAddRunning: false,
        processMinLife: 1,
        processMaxLife: 10,
        running: false,
        totalLapsedMs: 0,
        timeLapse: [],
        baseHeight: 30,
        current: 0,
        progressSplit: true,
        animalIndex: 0,
        animalList: [],
        frames: [],
        pages: [],
        activeProcesses: [],
        logItems: [],      
        physicalData: [],        
        virtualData: [],
        pageBlockStyle: {
            transition: this.rate / 1000 + 's all',
            animationDuration: '1s'           
        },
        progressBlockStyle: {
             height: '100%',
             animationName: 'expand',
             animationDuration: '1000ms',
             animationTimingFunction: 'linear',
             display: 'inline-block',
             transformOrigin: '0 0'          
        },
        processStyle: {
            transformOrigin: '0 0',
            animation: 'grow-in 1000ms',    
            minHeight: '100%',
            alignSelf: 'flex-start',
            boxSizing: 'border-box',
            boxShadow: '0 0 10px #000',
            backgroundSize: 'cover',
            transition: '.25s all'
        },
        pageBlockStyle: {
            height: Math.floor((this.pageSize / this.capacity) * 100) + '%'       
        }
    },
    watch: {
        running: function(val) {
            if (val) {
                 if (this.options.showLog) this.log("--- SIMULATION START ---");
                 this.cycle();
                 this.cycleAddProcess();
            } else if (this.options.showLog) this.log("--- SIMULATION PAUSED ---");
        },        
        rate: function(val) {
            this.pageBlockStyle.transition = val + 'ms all';
            this.pageBlockStyle.animationDuration = val + 'ms';
            this.progressBlockStyle.animationDuration = val + 'ms';
            this.progressBlockStyle.transition = val + 'ms all';
        },
        pageSize: function(val) {
            //this.pageBlockStyle.width = Math.floor((this.pageSize / this.capacity) * 100) + '%';            
            this.genPages();
            this.fifo();
        },
        capacity: function(val) {
            //this.pageBlockStyle.width = Math.floor((this.pageSize / this.capacity) * 100) + '%';            
            this.genPages();
            this.fifo();
        },
        pageSizeRandom: function(val) {
            this.genPages();
            this.fifo();
        }       
    },
    methods: {  
        cycle: function() {           
                setTimeout(function() {
                    for(var i = 0; i < vapp.$data.pages.length; i++) {                    
                        for(var e = vapp.$data.pages[i].processes.length - 1; e >= 0; e--) {                          
                             vapp.$data.pages[i].processes[e].burst -= vapp.$data.cycleRate;
                        if (vapp.$data.pages[i].processes[e].burst <= 0) { 
                            vapp.$data.pages[i].usage -= vapp.$data.pages[i].processes[e].m;
                            if (vapp.$data.pages[i].usage < 0) vapp.$data.pages[i].usage = 0;
                            var thisFrame = _.find(vapp.$data.frames, ['id', vapp.$data.pages[i].processes[e].id]);
                            if (vapp.$data.options.showLog) vapp.log("← Process " + thisFrame.id + " has completed");
                            vapp.$data.current-=vapp.$data.pages[i].processes[e].m;
                            vapp.$data.frames.splice(vapp.$data.frames.indexOf(thisFrame), 1);
                            vapp.$data.pages[i].processes.splice(e, 1);
                        }
                        }
                    }  
                    vapp.fifo(false);   
                    vapp.addChartData();             
                    if (vapp.$data.running) vapp.cycle();                                      
                }, vapp.$data.cycleRate);
        },
        cycleAddProcess: function() {
            setTimeout(function() {                         
                var np = gen();
                 var currentVirtualUsage = _.sumBy(vapp.$data.frames, function(f) { return f.m; });
                if (vapp.$data.virtualMemory - currentVirtualUsage >= np.m)  {
                    vapp.$data.animalIndex++;
                if (vapp.$data.animalIndex >= vapp.$data.animalList.length) vapp.$data.animalIndex = 0;
                np.animal = vapp.$data.animalList[vapp.$data.animalIndex]; 
                if (vapp.$data.options.showLog) vapp.log("+ Process " + np.id + " added to Virtual Memory Queue");            
                vapp.$data.frames.push(np);
                vapp.fifo(false); 
                } else if (vapp.$data.options.showLog) vapp.log("! ERROR: Process " + np.id + " not added, out of virtual memory!", "#f00");                  
                if (vapp.$data.running) vapp.cycleAddProcess();
            }, vapp.$data.rate);
        }, 
        log: function(val,color) {
            this.logItems.push({time: new moment(), timeString: moment().format('h:mm:ss'), value: val, color: color ? color : "#fff" });
            var logElement = $('#log');
            if (logElement.scrollHeight - logElement.clientHeight <= logElement.scrollTop + 1) {
                logElement.scrollTop = logElement.scrollHeight - logElement.clientHeight;
            }            
        },
        genFrames: function() {
            this.frames = [];
            var delay = 0;
            var complete = 0;
            for(var i = 0; i < this.frameCount; i++) {        
                this.frames.push(gen()); 
                    for(var q = 0; q < vapp.$data.frames.length; q++) {
                        vapp.$data.frames[q].animal = (q > vapp.$data.animalList.length) ? "[MISSING]" : vapp.$data.animalList[q]; 
                        vapp.$data.animalIndex++; 
                        if (vapp.$data.animalIndex > vapp.$data.animalList.length) vapp.$data.animalIndex = 0;           
                    }                        
            }            
        },
        addChartData: function() {
            this.timeLapse.push(Math.round((this.totalLapsedMs+=250 / 1000)));
            this.physicalData.push(this.current);
            this.virtualData.push(Math.round(_.sumBy(this.frames, function(f) { return f.m }) / this.virtualMemory));
            if (this.timeLapse.length > 5) {
                 this.timeLapse.shift();
                 this.physicalData.shift();
                 this.virtualData.shift();
            }
            vapp.$data.chartObject.update();
            //vapp.genChart();
        },
        genChart: function() {            
            var chart = new Chart($('#chartCanvas'), {
                type: 'line',              
                data: {
                    labels: this.timeLapse,
                    datasets: [
                    {
                        label: "Physical",
                        borderColor: "rgba(0,0,255,1)",
                        backgroundColor: "rgb(0,0,0,255)",
                        lineTension: 0.5,
                        borderCapStyle: 'butt',
                        borderJoinStyle: 'miter',
                        pointBorderWidth: 1,
                        pointHoverRadius: 5,
                        pointRadius: 2,
                        pointHitRadius: 10,
                        data: this.physicalData,
                        spanGaps: false
                    },
                    {
                        label: "Virtual",
                        lineTension: 0.5,
                        borderCapStyle: 'butt',
                        borderJoinStyle: 'miter',
                        pointBorderWidth: 1,
                        pointHoverRadius: 5,
                        pointRadius: 2,
                        pointHitRadius: 10,
                        data: this.virtualData,
                        spanGaps: false
                    }
                ]
                },                
                options: {
                    animation: false,
                    responsive: true                    
                }
            });
            return chart;
        },
        genPages: function() {
            this.pages = [];
            if (!this.pageSizeRandom) {
                var pageCount = vapp.$data.pageSize > vapp.$data.capacity ? 1 : Math.floor(vapp.$data.capacity / this.pageSize);
            for(var i = 0; i < pageCount; i++) {               
                vapp.$data.pages.push({
                    id: Math.floor(Math.random() * 1000), 
                    capacity: vapp.$data.pageSize,
                    width: Math.floor((vapp.$data.pageSize / this.capacity) * 100) + '%',
                    usage: 0,
                    processes: []
                });
            }
           
        } else {
            var remainingCapacity = vapp.$data.capacity;
                do {
                     var currentPageSize = Math.floor((Math.random() * vapp.$data.pageSize)) + 1;
                     if (currentPageSize > vapp.$data.pageSize) currentPageSize = vapp.$data.pageSize;                   
                     vapp.$data.pages.push({
                        id: Math.floor(Math.random() * 1000), 
                        capacity: currentPageSize,
                        width: Math.floor((currentPageSize / vapp.$data.capacity) * 100) + '%',
                        usage: 0,
                        processes: []
                     });
                     remainingCapacity -= currentPageSize;
                } while (remainingCapacity > 0);
            }                  
        },
        fifo: function(clear) {           
            var awaitingProcesses = _.filter(vapp.$data.frames, function(b) { return b.pageId === null; });
            for(var i = 0; i < awaitingProcesses.length; i++) {
                var p = awaitingProcesses[i];
                var mem = p.m;
                var candidate;
                switch (this.additionMode) {
                    case 'firstFit': {
                        candidate = _.find(vapp.$data.pages, function(page) {              
                            return (page.capacity - page.usage) >= mem; 
                                });
                        break;
                    }
                    case 'bestFit': {
                        candidate = _.minBy(_.filter(vapp.$data.pages, function(page) {
                            return (page.capacity - page.usage) >= mem;
                        }, function (subPage) {
                            return (subPage.capacity - subPage.usage);
                        }));              
                        break;
                    }
                    case 'worstFit': {
                        candidate = _.maxBy(_.filter(vapp.$data.pages, function(page) {
                            return (page.capacity - page.usage) >= mem;
                        }, function (subPage) {
                            return (subPage.capacity - subPage.usage);
                        }));
                        break;
                    }
                }
                
                if (candidate != null) {
                    p.pageId = candidate.id;
                    p.width = Math.floor((p.m / candidate.capacity) * 100) + '%';
                    candidate.usage += p.m;
                    candidate.processes.push(p); 
                    vapp.$data.current += p.m;
                    if (vapp.$data.options.showLog) vapp.log("→ Process " + p.id + " loaded into Page " + candidate.id);
                }
            } 
        },       
        focusPage: function(event) { 
            var current = $(event.currentTarget).data('is-focused');
            $(event.currentTarget).data('is-focused', !current);
            $(event.currentTarget).attr('height', '100%');
            
        },
        init: function () {
            $.get('/get-animals', function(v) {
                vapp.$data.animalList = shuffle(v);  
                /*for(var i = 0; i < vapp.$data.animalList.length; i++) {
                    $.get('https://api.cognitive.microsoft.com/bing/v5.0/images/search?license=public&safeSearch=Strict&imageType=Photo&q=' + vapp.$data.animalList[i], function(r) {
                        console.log(r.webSearchUrl ? r.webSearchUrl : vapp.$data.animalList[i] + ' -> NULL');
                    });
                } */                  
                vapp.genFrames();
                vapp.genPages();
                vapp.$data.chartObject = vapp.genChart();
                vapp.fifo();               
            });
        }
    }
});

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;
  while (0 !== currentIndex) {
    
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
   
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}



function addPage() {
    var newProcess = gen(); 
    if ((vapp.$data.current + newProcess.m) < vapp.$data.capacity) {//push process
        add(newProcess);
    } else {//remove a process
        do {
            var r = vapp.$data.activeProcesses.shift();
            vapp.$data.current -= r.m;
        } while ((vapp.$data.current + newProcess.m) > vapp.$data.capacity);
        add(newProcess);    
    } 
    setTimeout(addPage, vapp.$data.rate);
}

function add(newProcess) {
    vapp.$data.activeProcesses.push(newProcess);
    vapp.$data.current += newProcess.m;
    vapp.$data.memStatusBar = (vapp.$data.current / vapp.$data.capacity) * uiWidth + 'px';
}

function gen(id, mem) {
    var b = (Math.round(Math.random() * vapp.$data.processMaxLife) + vapp.$data.processMinLife) * 1000;  
    return {
        m: Math.floor(Math.random() * vapp.$data.memRange) + 1,
        id: Math.floor(Math.random() * 1000),
        color: randomColor(0),
        burst: b,
        maxBurst: b,
        animal: null,
        pageId: null     
    }
}

function randColor() {
    return "#"+((1<<24)*Math.random()|0).toString(16);
}

function randomColor(brightness){
  function randomChannel(brightness){
    var r = 255-brightness;
    var n = 0|((Math.random() * r) + brightness);
    var s = n.toString(16);
    return (s.length==1) ? '0'+s : s;
  }
  return '#' + randomChannel(brightness) + randomChannel(brightness) + randomChannel(brightness);
}

//Initial Values
//vapp.$data.rate = 1000;
//vapp.$forceUpdate();
vapp.init();
manageUi();

function manageUi() {
    $('.page-frame').resizable().draggable({containment: "document", handle: ".section-header" });
    $('#frame-frame').draggable({containment: "document", handle: ".section-header"});  
    $('.log-frame').draggable({containment: "document", handle: ".section-header"});
    $('.chart-frame').resizable().draggable({containment: "document", handle: ".section-header"});
}