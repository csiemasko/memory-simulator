const uiWidth = 500;

var vapp = new Vue({
    el: '#root',
    data: {
        memStatusBar: '0%',
        memRange: 20,
        rate: 1000,
        current: 0,
        progressSplit: true,
        capacity: 100,
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
        }
    },
    watch: {
        rate: function(val) {
            this.pageBlockStyle.transition = val + 'ms all';
            this.pageBlockStyle.animationDuration = val + 'ms';
            this.progressBlockStyle.animationDuration = val + 'ms';
            this.progressBlockStyle.transition = val + 'ms all';
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
    console.log('currentusage: ' + vapp.$data.current + ' | ' + vapp.$data.progressSplit);
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
addPage();