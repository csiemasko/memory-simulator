const uiWidth = 500;

var vapp = new Vue({
    el: '#root',
    data: {
        memStatusBar: '0%',
        memRange: 20,
        rate: 1000,
        baseHeight: 30,
        current: 0,
        progressSplit: true,
        capacity: 100,
        pageSizeRandom: false,
        pageSize: 30,
        frameCount: 10,
        frames: [],
        pages: [],
        activeProcesses: [],
        allocation: 100,       
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
                    processes: []
                });
            }
        } else {            
            var remainingCapacity = this.capacity;
                do {
                     var currentPageSize = Math.floor((Math.random() * this.pageSize)) + 1;
                     if (currentPageSize > this.pageSize) currentPageSize = this.pageSize;
                     console.log('page size: ' + currentPageSize);
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
            console.log('active: ' + this.frames.length);
            outer: for(var i = 0; i < this.frames.length; i++) {
                var currentProcess = this.frames[i]; 
                currentProcess.pageId = null;               
                inner: for (var q = 0; q < this.pages.length; q++) {
                    var currentPage = this.pages[q];
                    console.log('c page capacity: ' + currentPage.capacity);
                    console.log('c page process count: ' + currentPage.processes.length);
                    var sum = _.sumBy(currentPage.processes, function(p) { return p.m; });
                    console.log('sum: ' + sum);
                    if ((currentPage.capacity - sum) >= currentProcess.m) {//Page has room                        
                        currentProcess.pageId = currentPage.id;
                        currentProcess.width = Math.floor((currentProcess.m / currentPage.capacity) * 100) + '%';
                        currentPage.processes.push(currentProcess);

                        console.log('added ' + currentProcess.id + ' to ' + currentPage.id);
                        continue outer;
                    }
                    else console.log('nope');
                }
            }
        }
    }
});



function addPage() {
    var newProcess = gen();
    //currentUsage = _.sumBy(activeProcesses, function(p) { return p.mem; });
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
        color: randColor()
    }
}

function randColor() {
    return "#"+((1<<24)*Math.random()|0).toString(16);
}

//Start
vapp.$data.rate = 1000;
vapp.$forceUpdate();
//addPage();

vapp.genFrames();
vapp.genPages();
vapp.fifo();