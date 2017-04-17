var vapp = new Vue({
    el: '#root',
    data: {
        memStatusBar: '0%',
        rate: 3000,
        current: 0,
        capacity: 100,
        activeProcesses: []
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
    console.log('currentusage: ' + vapp.$data.current);
    vapp.$data.memStatusBar = (vapp.$data.current / vapp.$data.capacity) * 500 + 'px';
}

function gen(id, mem) {
    return {
        m: Math.floor(Math.random() * 20) + 1,
        id: Math.floor(Math.random() * 1000),
        color: randColor()
    }
}

function randColor() {
    return "#"+((1<<24)*Math.random()|0).toString(16);
}
addPage();