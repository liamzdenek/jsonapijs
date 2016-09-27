function IncludeInstructions(rawinst) {
    this.include = [];
    this.children = {};
   
    if(rawinst) { 
        inst_strs = rawinst.split(",");
        for(let i in inst_strs) {
            this.push(inst_strs[i].split("."));
        }
    }
}

IncludeInstructions.prototype.push = function(inst_rels) {
    if(inst_rels.length == 0) {
        return;
    }
    if(inst_rels.length == 1) {
        this.include.push(inst_rels[0]); 
    } else {
        let child = inst_rels.shift();
        if(!this.children[child]) {
            this.children[child] = new IncludeInstructions();
        }
        this.children[child].push(inst_rels)
    }
    
}

IncludeInstructions.prototype.get_child = function(childname) {
    return this.children[childname] || new IncludeInstructions();
}

module.exports = function(rawinst) {
    return new IncludeInstructions(rawinst);
}
