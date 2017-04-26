const uiWidth = 500;

var vapp = new Vue({
    el: '#root',
    data: {       
        options: {
            showId: true,
            showSize: true,
            showAnimalName: true,
            showAnimalImage: true            
        },           
        capacity: 100,
            pageSize: 30,
            frameCount: 10,
            allocation: 100,
            memRange: 20,
            pageSizeRandom: false,
            rate: 1000,
        memStatusBar: '0%',
        baseHeight: 30,
        current: 0,
        progressSplit: true,
        animalList: [],
        frames: [],
        pages: [],
        activeProcesses: [],              
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
        rate: function(val) {
            this.pageBlockStyle.transition = val + 'ms all';
            this.pageBlockStyle.animationDuration = val + 'ms';
            this.progressBlockStyle.animationDuration = val + 'ms';
            this.progressBlockStyle.transition = val + 'ms all';
        },
        pageSize: function(val) {
            this.pageBlockStyle.width = Math.floor((this.pageSize / this.capacity) * 100) + '%';            
            this.genPages();
            this.fifo();
        },
        capacity: function(val) {
            this.pageBlockStyle.width = Math.floor((this.pageSize / this.capacity) * 100) + '%';            
            this.genPages();
            this.fifo();
        },
        pageSizeRandom: function(val) {
            this.genPages();
            this.fifo();
        }
    },
    methods: {              
        genFrames: function() {
            this.frames = [];
            for(var i = 0; i < this.frameCount; i++) {
                this.frames.push(gen());
            }
            for(var q = 0; q < this.frames.length; q++) {
                this.frames[q].animal = (q > this.animalList.length) ? "[MISSING]" : this.animalList[q];             
            }
        },
        genPages: function() {
            this.pages = [];
            if (!this.pageSizeRandom) {
                var pageCount = this.pageSize > this.capacity ? 1 : Math.floor(this.capacity / this.pageSize);
            for(var i = 0; i < pageCount; i++) {               
                this.pages.push({
                    id: Math.floor(Math.random() * 1000), 
                    capacity: this.pageSize,
                    width: Math.floor((this.pageSize / this.capacity) * 100) + '%',
                    usage: 0,
                    processes: []
                });
            }
        } else {            
            var remainingCapacity = this.capacity;
                do {
                     var currentPageSize = Math.floor((Math.random() * this.pageSize)) + 1;
                     if (currentPageSize > this.pageSize) currentPageSize = this.pageSize;                   
                     this.pages.push({
                        id: Math.floor(Math.random() * 1000), 
                        capacity: currentPageSize,
                        width: Math.floor((currentPageSize / this.capacity) * 100) + '%',
                        processes: []
                     });
                     remainingCapacity -= currentPageSize;

                } while (remainingCapacity > 0);
            }
            
        },
        fifo: function() {            
            var delay = 0;  
            this.current = 0;
            for(p in this.pages) {
                p.processes = [];
            }
            console.log('active: ' + this.frames.length);
            outer: for(var i = 0; i < this.frames.length; i++) {
                var currentProcess = this.frames[i]; 
                currentProcess.pageId = null;               
                inner: for (var q = 0; q < this.pages.length; q++) {
                    var currentPage = this.pages[q];                
                    var sum = _.sumBy(currentPage.processes, function(p) { return p.m; });                    
                    if ((currentPage.capacity - currentPage.usage) >= currentProcess.m) {//Page has room                        
                        currentProcess.pageId = currentPage.id;
                        currentProcess.width = Math.floor((currentProcess.m / currentPage.capacity) * 100) + '%';
 
                        currentPage.usage+=currentProcess.m;
                        continue outer;
                    }                   
                }
            }            
            for(var k = 0; k < this.frames.length; k++) { 
                if (!this.frames[k].pageId) continue;
                this.addProcess(k,delay+=100);
            }          
        },
        addProcess: function(k,delay) {
            setTimeout(function() {                    
            var f = vapp.$data.frames[k];
            if (f == null || f == undefined) {}
            var page = _.find(vapp.$data.pages, ['id', f.pageId]);
            page.processes.push(f); 
            vapp.$data.current += f.m;
            }, delay);                       
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
    return {
        m: Math.floor(Math.random() * vapp.$data.memRange) + 1,
        id: Math.floor(Math.random() * 1000),
        color: randomColor(0),
        animal: null        
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
   
}