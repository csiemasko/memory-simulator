var papp = new Vue({
    el: '#root',
    data: {
        options: {
            mode: 'demo',
            startingAddress: 0,
            algorithm: "LRU"
        },
        processSize: 50000,
        currentProcess: null,
        logItems: [],
        progress: 0,
        cycles: 50,
        delay: 200,
        running: false,
        favPg1: 0,
        favPg2: 0,
        randomCnt: 0,
        toggle: false,
        simStart: null
    },
    watch: {
        running: function(v) {
            if (v) this.run();
        }
    },
    methods: {
        run: function() {
            this.simStart = moment();
            Log('--- BEGIN SIMULATION ---', '#0f0');
            var processor = new ProcessorData();
            this.currentProcess = new Process(processor);
            if (this.options.mode == 'demo') {    
                this.currentProcess.processSize = this.processSize;         
                this.currentProcess.run(this.cycles);
            } else if (this.options.mode == 'collection') {
                this.delay = 5;
                this.cycles = 1000;
                this.currentProcess.processSize = this.processSize;
                this.currentProcess.framesAllocated = 4;
                this.currentProcess.pageSize = processor.pageSize;
                this.currentProcess.algo = processor.algo;
                this.currentProcess.run(1000);

                this.currentProcess.processSize = 20000;
                this.cycles = 8000;
                this.currentProcess.framesAllocated = 3;
                this.currentProcess.pageSize = processor.pageSize;
                this.currentProcess.algo = processor.algo;
                this.currentProcess.run(8000);
            }
           
        }
    }
});
//Page Class
function Page() {
    this.pageName = "";
    this.frameNum = 0;
    this.validity = false;
    this.pageRefCnt = 0;
    this.current = false;
    this.flag = false;
    this.secondChance = false;
    this.lruRef = 0;
    this.lfuRef = 0;
}

Page.prototype.changeLruRef = function(goingUp) {
    if (goingUp === true) {
        this.lruRef = 0;
    } else {
        this.lruRef--;
    }
}

Page.prototype.changeLfuRef = function(goingUp) {
    if (goingUp === true) {
        this.lfuRef++;
    }
}

Page.prototype.setFrameNum = function(val) {
    this.frameNum = val;
    this.validity = true;
}
Page.prototype.getFrameNum = function(val) {
    if (this.validity === true) return this.frameNum;
    else return -1;
}
Page.prototype.incrementRefCnt = function() {
    this.pageRefCnt++;
}
Process.prototype.invalidatePagewithThisFrame = function(frameNum,ppt) {
    for( var i = 0; i < ppt.numPages; i++) {//minimize this
        if (ppt.pageTable[i].frameNum == frameNum) {
            ppt.pageTable[i].validity = false;
        }
    }
}
//Algorithms
Process.prototype.leastRecentlyUsedAlgo = function(ppt, framesAllocated, page, willReplace) {
    temp = [];
    for(var i = 0; i < ppt.pageTable.length; i++) {
        if (ppt.pageTable[i].frameNum != -1 && ppt.pageTable[i].validity == true) {
            temp.push(ppt.pageTable[i]);
        }
    }

    temp = _.sortBy(temp, 'frameNum');

    temp.forEach(function (p,index,array) {
        if (p.pageNumber == page) {
            this.changeLruRef(true);
            for(var test in ppt.pageTable) {
                if (test == p) {
                    test.changeLruRef(true);
                }
            }
        }
        else {
            p.changeLruRef(false);
            for(var test in ppt.pageTable) {
                if (test == p) {
                    test.changeLruRef(false);
                }
            }
        }
    });

    var lowestRef = 0;//change to high?
    var pageWithLowerRef = temp[0];
    for (var p in temp) {
        if (p.lruRef < lowestRef) {
            lowestRef = p.lruRef;
            pageWithLowerRef = p;
        }     
    }

    if (willReplace) this.invalidatePagewithThisFrame(pageWithLowerRef.frameNum, ppt);
    return pageWithLowerRef.frameNum;    
}
Process.prototype.secondChanceAlgo = function(ppt, framesAllocated, page, replacing) {
    var temp = this.cloneSortArray(ppt, framesAllocated);
    if (replacing == false) {
        for (var p in temp) {
            if (p.pageNumber == ppt.pageTable[page].pageNumber) {
                p.secondChance = true;
                break;
            }
        }
        return 0;
    }

    if (temp.length == framesAllocated) {
        for (var i = 0; i < temp.length; i++) {
            if (temp[i].flag == true && temp[i].secondChance == false) {
                temp[i].secondChance = false;
                if (i == temp.length - 1) {
                    temp[0].flag = true;
                } else {
                    temp[i+1].flag = true;
                }
                this.invalidatePagewithThisFrame(temp[i].frameNum, ppt);
                return temp[i].frameNum;
            }
            if (temp[i].flag == true && temp[i].secondChance == true) {
                temp[i].secondChance = false;
                temp[i].flag = false;
                if (i < temp.length - 1) {
                    temp[i+1].flag = true;
                } else {
                    temp[0].flag = true;
                }
            }
        }
    }
    temp[1].flag = true;
    this.invalidatePagewithThisFrame(temp[0].frameNum, ppt);
    return temp[0].frameNum;
}
Process.prototype.leastFrequentlyUsedAlgo = function(ppt, framesAllocated, page, willReplace) {
    var temp = [];
    for (var i = 0; i < ppt.pageTable.length; i++) {
        if (ppt.pageTable[i].frameNum != -1 && ppt.pageTable[i].validity == true) {
            temp.push(ppt.pageTable[i]);
        }
    }

    temp = _.sortBy(temp, 'frameNum');

    ppt.pageTable.forEach(function (p,i,a) {
        if (p.pageNum == page) {
            p.lfuRef = true;
        }
    });

    var lowestRef = 100000;
    var pageWithLowestRef = temp[0];
    ppt.pageTable.forEach(function (p,i,a) {
        if (p.validity == true && p.lfuRef < lowestRef) {
            lowestRef = p.lfuRef;
            pageWithLowestRef = p;
        }
    });

    if (willReplace) {
        Log('-> Replacing frame ' + pageWithLowestRef.frameNum);
        this.invalidatePagewithThisFrame(pageWithLowestRef.frameNum, ppt);
    }

    return pageWithLowestRef.frameNum;

    /*if (temp.length == framesAllocated) {
        for (var i = 0; i < temp.length; i++) {
            if (temp[i].flag == true) {
                temp[i].flag = false;
            }
            if (i == temp.length - 1) {
                temp[0].flag = true;
            } else {
                temp[i+1].flag = true;
            }
            this.invalidatePagewithThisFrame(temp[i].frameNum, ppt);
            return temp[i].frameNum;
        }
    }

    temp[i].flag = true;
    this.invalidatePagewithThisFrame(temp[0].frameNum, ppt);
    return temp[0].frameNum;*/
}
Process.prototype.firstInFirstOutAlgo = function (ppt, framesAllocated, page, pff, pageFaultRate) {
    if (pff == true && pageFaultRate > 0.7) {
        //Change frames allocated
    }
    var temp = this.cloneSortArray(ppt, framesAllocated);
    if (temp.length == framesAllocated) {
        for (var i = 0; i < temp.length; i++) {
            if (temp[i].flag == true) {
                temp[i].flag = false;
                if (i == temp.length - 1) {
                    temp[0].flag = true;
                } else {
                    temp[i+1].flag = true;
                }
                this.invalidatePagewithThisFrame(temp[i].frameNum, ppt);
                return temp[i].frameNum;
            }
        }
    }
    temp[1].flag = true;

    this.invalidatePagewithThisFrame(temp[0].frameNum, ppt);
    return temp[0].frameNum;
}
Process.prototype.cloneSortArray = function (ppt, framesAllocated) {
    var temp = [];
    for (var i = 0; i < ppt.pageTable.length; i++) {
        if (ppt.pageTable[i].frameNum < framesAllocated && ppt.pageTable[i].frameNum != -1) {
            temp.push(ppt.pageTable[i]);
        }
    }
    temp = _.sortBy(temp, 'frameNum');
    return temp;
}
function sort(pages) {
    for (var i = 0; i < pages.length - 1; i++) {
        if (pages[i].frameNum > pages[i+1].frameNum) {
            var t = pages[i];
            pages[i] = pages[i+1];
            pages[i+1] = t;
            i = -1;
        }
    }
    return pages;
}
function PageProcTable(processsize, pagesize) {
    this.pageTable = [];  
    this.numPages = Math.floor(processsize / pagesize);
  
    var x = 'a';
    for (var i = 0; i < this.numPages; i++) {
        x = String.fromCharCode(97 + i);
        var newPage = new Page();
        newPage.pageName = x;
        newPage.frameNum = 0;
        newPage.validity = false;
        newPage.pageRefCnt = 0;
        this.pageTable.push(newPage);
    }  
}
PageProcTable.prototype.setFrameNum = function(pagenum, framenum) {//Possible remove, uneccessary
    var temp = this.pageTable[pagenum];
    temp.frameNum = framenum;
    temp.validity = true;
    this.pageTable[pagenum] = temp;//Probably uneccessary
}
function ProcessorData(pagesize, algo) {
    this.pageSize = pagesize ? pagesize : 1024;
    this.algo = algo ? algo : 3;
}
function Process(processordata,processsize,framesallocated) {
    this.processSize = processsize ? processsize : 50000;
    this.currentAddress = 0;
    this.memAccessCnt = 0;
    this.pageFaultCnt = 0;
    this.nextFrameNum = 0;
    this.framesAllocated = framesallocated ? framesallocated : 4;
    this.newFrameNum = 0;
    this.pageSize = processordata ? processordata.pageSize : 0;
    this.algo = processordata ? processordata.algo : 3;    
    this.pageFaultRate= 0;  
 
    this.ppt = new PageProcTable(this.processSize, this.pageSize);
}
Process.prototype.locality = function(processsize,curraddress) {
    var selector = Math.round(Math.random() * 100);
    if (selector < 50) curraddress++;
    else if (selector < 98) {
        if (papp.$data.toggle == true) {
            papp.$data.toggle = false;
            curraddress = (papp.$data.favPg1 * this.pageSize) + this.pageSize / 2;
        } else {
            papp.$data.toggle = true;
            curraddress = (papp.$data.favPg2 * this.pageSize) + this.pageSize / 2;
        }
    }
    else {
        curraddress = Math.round(Math.random() * processsize);   
        papp.$data.randomCnt++;
    }  
    if (curraddress < 0) curraddress = 100;
    if (curraddress >= processsize) curraddress = Math.round(processsize / 2);
    return curraddress;    
}
Process.prototype.getPageNum = function(curraddress, pagesize) {
    return Math.floor(curraddress / pagesize);
}
Process.prototype.randomRAlgo = function() {
    var victimFrameNum = -1;
    victimFrameNum = Math.round((Math.round((Math.random() * 100)) % this.framesAllocated));
    var i = 0;
    while(victimFrameNum != this.ppt.pageTable[i].getFrameNum(i)) {
        if (i > this.ppt.numPages) break;
        i++;
    }

    this.ppt.pageTable[i].validity = false;
    return victimFrameNum;
}
Process.prototype.doPaging = function(pagenum) {
    this.ppt.pageTable[pagenum].incrementRefCnt();
    if (this.nextFrameNum < this.framesAllocated) {
        if (this.nextFrameNum == 0) {
            papp.$data.favPg1 = pagenum;
        } else if (this.nextFrameNum == 1) {
            papp.$data.favPg2 = pagenum;
        }

        this.ppt.setFrameNum(pagenum, this.nextFrameNum);
        this.nextFrameNum++;
    }
    else {//Replacement Algorithm       
        switch (papp.$data.options.algorithm) {
            case 'RANDOM': {
                this.newFrameNum = this.randomRAlgo();
                this.ppt.setFrameNum(pagenum, this.newFrameNum);
                Log('Assigning Random Frame: ' + this.newFrameNum + ' to page: ' + pagenum + '(' + this.ppt.pageTable[pagenum].pageName + ')');
                break;
            }
            case 'FIFO': {
                this.newFrameNum = this.firstInFirstOutAlgo(this.ppt, this.framesAllocated, pagenum, false, 0);
                break;
            }
            case 'LRU': {
                this.newFrameNum = this.leastRecentlyUsedAlgo(this.ppt, this.framesAllocated, pagenum, true);
                break;
            }
            case 'LFU': {
                this.newFrameNum = this.leastFrequentlyUsedAlgo(this.ppt, this.framesAllocated, pagenum, true);
                break;
            }
            case 'SC': {
                this.newFrameNum = this.secondChanceAlgo(this.ppt, this.framesAllocated, pagenum, true);
                break;
            }
            case 'PFF': {
                var ff = this.pageFaultCnt / this.memAccessCnt * 100;
                this.newFrameNum = this.firstInFirstOutAlgo(this.ppt, this.framesAllocated, pagenum, true, ff);
                break;
            }
        }
        this.ppt.setFrameNum(pagenum, this.newFrameNum);
      
        Log('--- Pages Currently In Memory ---', 'yellow');
        for(var i = 0; i < this.ppt.pageTable.length; i++) {
            if (this.ppt.pageTable[i].frameNum < 0) {

            } else {
                Log('--> Page ' + i + ' is in frame ' + this.ppt.pageTable[i].frameNum);
            }
        }
        this.pageFaultCnt++;
    }
}
Process.prototype.memAccess = function() {
    var pageNum;
    this.currentAddress = this.locality(this.processSize, this.currentAddress);
    pageNum = this.getPageNum(this.currentAddress, this.pageSize);
    //Validity Check
   
        if (this.ppt.pageTable[pageNum].validity == true) {      
        _.forEach(this.ppt.pageTable, function (t) {
            t.current = false;
        });
        this.ppt.pageTable[pageNum].current = true;
        this.ppt.pageTable[pageNum].incrementRefCnt();
        switch (papp.$data.options.algorithm) {
            case 'LRU': {
                this.leastRecentlyUsedAlgo(this.ppt, this.framesAllocated, pageNum, false);
                break;
            }
            case 'LFU': {
                this.leastFrequentlyUsedAlgo(this.ppt, this.framesAllocated, pageNum, false);
                break;
            }
            case 'SC': {
                this.secondChanceAlgo(this.ppt, this.framesAllocated, pageNum, false);
                break;
            }
        }
    }
    else {
        //Call do paging
        this.doPaging(pageNum);
    }
   
    
    this.memAccessCnt++;
}
Process.prototype.handle = function() {
    //Kelly handle stuff here
}
Process.prototype.run = function(cycles) {   
    Log('Starting Address: ' + this.currentAddress);
    for(var i = 0; i < cycles; i++) {
        var p = this;
        papp.$data.progress = 0;     
        setTimeout(function() {  
            if (papp.$data.running) {
                p.memAccess();
            if (papp.$data.progress == (cycles - 1)) {
                Log('Number of Memory Accesses: ' + p.memAccessCnt);
                Log('Number of Page Faults: ' + p.pageFaultCnt);
                p.pageFaultRate = (p.pageFaultCnt / p.memAccessCnt * 100);
                Log('Page Fault Rate: ' + p.pageFaultRate + '%');
                var seconds = moment.duration(moment().diff(papp.$data.simStart)).asSeconds();
                Log('--- END SIMULATION --- (' + seconds + ' sec.)', '#f00');
                papp.$data.running = false;
                papp.$data.progress = cycles;
                _.forEach(papp.$data.currentProcess.ppt.pageTable, function (p) {
                    p.current = false;
                });
            } else {             
                papp.$data.progress++;                
            } 
            } else papp.$data.progress = 0;
        }, papp.$data.delay*i);        
    }
    
}

function Log(val, color) {
    var colorCode = color ? color : '#fff';
    console.log(val);
    papp.$data.logItems.push({ 
        text: '[' + moment().format('h:mm:ss:SSS') + ']: ' + val,
        color: colorCode
});
}

function nav() {
    
}

function main() {

}