var Helper;
(function (Helper) {
    "use strict";
    /**
     * A class to define constants used throughout WebLogo
     */
    class Constants {
    }
    // These are used as keys in the Compiler's mainDict
    Constants.COLLISIONS = "Collisions";
    Constants.PROCEDURES = "Procedures";
    Constants.EVERYONE = "Everyone";
    Constants.WORLD = "The World";
    Constants.MAPSIZE = 50.5;
    Constants.MAPCEILING = 50;
    ////////////////////Agent Information:////////////////////////////
    Constants.DEFAULT_TRAIT_NAMES = new Set([
        "id", "breed", "x", "y", "z", "heading", "color", "shape", "size",
    ]);
    Constants.DEFAULT_TRAITS = [
        { "name": "x", "traitType": "data", "defaultValue": "0" },
        { "name": "y", "traitType": "data", "defaultValue": "0" },
        { "name": "z", "traitType": "data", "defaultValue": "0" },
        { "name": "heading", "traitType": "data", "defaultValue": "0" },
        { "name": "color", "traitType": "data", "defaultValue": "#ff0000" },
        { "name": "shape", "traitType": "data", "defaultValue": "cube" },
        { "name": "size", "traitType": "data", "defaultValue": "1" },
    ];
    Constants.AST_DONE = -1;
    Constants.AST_YIELD = -2;
    Constants.AST_YIELD_REPEAT = -3;
    Constants.AST_YIELD_REPEAT_NO_BRANCH = -4;
    Constants.AST_REPEAT = -5;
    Constants.AST_PROC_CALL = -6;
    Constants.AST_PROC_RET = -7;
    Constants.YIELD_NORMAL = "YIELD NORMAL";
    Constants.YIELD_INTERRUPT = "YIELD INTERRUPT";
    Constants.LIST_BEGINNING = 0;
    Constants.LIST_END = 1;
    Constants.LIST_INDEX = 2;
    Constants.THREAD_RUN_NOCHECK = 0;
    Constants.THREAD_RUN_IFOK = 1;
    Helper.Constants = Constants;
})(Helper || (Helper = {}));
/// <reference path="../Helper/Constants.ts" />
var Common;
(function (Common) {
    "use strict";
})(Common || (Common = {}));
var Common;
(function (Common) {
    "use strict";
    class Trait {
        constructor(id, name, dataType, defaultValue) {
            this.id = id;
            this.name = name;
            this.dataType = dataType;
            this.defaultValue = defaultValue;
        }
    }
    Common.Trait = Trait;
})(Common || (Common = {}));
/// <reference path="Trait.ts" />
var Common;
(function (Common) {
    "use strict";
    var Trait = Common.Trait;
    class Breed {
        constructor(name, shape) {
            this.traits = new Array();
            this.customTraits = new Array();
            this.traitIDBase = 0;
            this.namedTraits = new Map();
            this.id = Breed.idBase++;
            this.name = name;
            this.shape = shape || "cube";
        }
        getReadableTraits() {
            var readableTraits = ["id", "breed", "x", "y", "z", "heading", "color", "shape", "size"];
            for (var i = 0; i < this.traits.length; i++) {
                if (this.traits[i] !== undefined) {
                    readableTraits.push(this.traits[i].name);
                }
            }
            return readableTraits;
        }
        getChangeableTraits() {
            var changeableTraits = [];
            // the World's built-in traits can't be modified
            // (change this if some eventually can be!)
            if (this.name != Helper.Constants.WORLD) {
                changeableTraits = ["x", "y", "z", "heading", "color", "shape", "size"];
            }
            for (var i = 0; i < this.traits.length; i++) {
                if (this.traits[i] !== undefined) {
                    changeableTraits.push(this.traits[i].name);
                }
            }
            return changeableTraits;
        }
        getCustomTraits() {
            var customTraits = [];
            for (var i = 0; i < this.traits.length; i++) {
                if (this.traits[i] !== undefined) {
                    customTraits.push(this.traits[i].name);
                }
            }
            return customTraits;
        }
        getTraitID(name) {
            return this.namedTraits.get(name).id;
        }
        addTrait(name, dataType, defaultValue) {
            if (this.namedTraits.has(name)) {
                return false;
            }
            var trait = new Trait(this.traitIDBase++, name, dataType, defaultValue);
            this.namedTraits.set(trait.name, trait);
            this.traits[trait.id] = trait;
            this.customTraits[trait.id] = trait;
            return true;
        }
        renameTrait(oldName, newName, defaultValue) {
            if (!this.namedTraits.has(oldName) || this.namedTraits.has(newName)) {
                return false;
            }
            var trait = this.namedTraits.get(oldName);
            trait.name = newName;
            if (defaultValue) {
                trait.defaultValue = defaultValue;
            }
            return true;
        }
        removeTrait(name) {
            if (!this.namedTraits.has(name)) {
                return false;
            }
            var trait = this.namedTraits.get(name);
            this.namedTraits.delete(name);
            delete (this.traits[trait.id]);
            delete (this.customTraits[trait.id]);
            return true;
        }
    }
    Breed.idBase = 0;
    Common.Breed = Breed;
})(Common || (Common = {}));
var Execution;
(function (Execution) {
    "use strict";
    class AgentState {
        constructor(x, y, z, heading, color, size, shape) {
            this.x = x || 0;
            this.y = y || 0;
            this.z = z || 0;
            this.heading = heading || 0;
            this.color = (color === undefined) ? 0xffffff : color;
            this.size = (size === undefined) ? 1 : size;
            this.shape = (shape === undefined) ? "cube" : shape;
        }
        copy() {
            return new Execution.AgentState(this.x, this.y, this.z, this.heading, this.color, this.size, this.shape);
        }
        copyFrom(state) {
            this.x = state.x;
            this.y = state.y;
            this.z = state.z;
            this.heading = state.heading;
            this.color = state.color;
            this.size = state.size;
            this.shape = state.shape;
        }
    }
    Execution.AgentState = AgentState;
})(Execution || (Execution = {}));
/// <reference path="../Common/Agent.ts" />
var DataStructures;
(function (DataStructures) {
    "use strict";
    class Bin {
        constructor(minX, maxX, minY, maxY, id) {
            /**
             * All the agents in the bin
             * NOTE: should this be replaced with a weak-reference dictionary
             * so that any agents that are removed elsewhere will automatically disappear?
             */
            this.contents = new Set();
            this.xMin = minX;
            this.xMax = maxX;
            this.yMin = minY;
            this.yMax = maxY;
            this.xMid = (this.xMin + this.xMax) / 2;
            this.yMid = (this.yMin + this.yMax) / 2;
            this.xWidth = this.xMax - this.xMin;
            this.yHeight = this.yMax - this.yMin;
            this.id = id;
        }
        /**
         * Puts an agent in a bin.
         * Returns true if the agent was successfully added,
         * false, if the agent does not belong in this bin
         */
        insert(agent) {
            this.contents.add(agent);
            return true;
        }
        remove(agent) {
            this.contents.delete(agent);
        }
    }
    DataStructures.Bin = Bin;
})(DataStructures || (DataStructures = {}));
/// <reference path="../Common/Thread.ts" />
/// <reference path="../Common/Breed.ts" />
/// <reference path="../Execution/AgentState.ts" />
/// <reference path="../DataStructures/Bin.ts" />
var Common;
(function (Common) {
    "use strict";
})(Common || (Common = {}));
var Helper;
(function (Helper) {
    "use strict";
    class Comparison {
        static equals(a, b) {
            var EPSILON = Number(0.000000001);
            if (a === b) {
                return true;
            }
            else if (!isNaN(Number(a)) && !isNaN(Number(b))) {
                if (Math.abs(Number(a) - Number(b)) <= EPSILON) {
                    return true;
                }
                else {
                    return false;
                }
            }
            else if (String(a) === String(b)) {
                return true;
            }
            else if (a !== undefined && a.hasOwnProperty("equals") && a.equals(b)) {
                return true;
            }
            else if (b !== undefined && b.hasOwnProperty("equals") && b.equals(a)) {
                return true;
            }
            else {
                return false;
            }
        }
        static lt(a, b) {
            var n1 = Number(a);
            var n2 = Number(b);
            if (isNaN(n1) || isNaN(n2)) {
                return String(a) < String(b);
            }
            else {
                return n1 < n2;
            }
        }
        static lte(a, b) {
            var n1 = Number(a);
            var n2 = Number(b);
            if (isNaN(n1) || isNaN(n2)) {
                return (String(a) <= String(b)) || Helper.Comparison.equals(a, b);
            }
            else {
                return n1 <= n2;
            }
        }
        static gt(a, b) {
            var n1 = Number(a);
            var n2 = Number(b);
            if (isNaN(n1) || isNaN(n2)) {
                return String(a) > String(b);
            }
            else {
                return n1 > n2;
            }
        }
        static gte(a, b) {
            var n1 = Number(a);
            var n2 = Number(b);
            if (isNaN(n1) || isNaN(n2)) {
                return (String(a) >= String(b)) || Helper.Comparison.equals(a, b);
            }
            else {
                return n1 >= n2;
            }
        }
    }
    Helper.Comparison = Comparison;
})(Helper || (Helper = {}));
/// <reference path="../Common/Agent.ts" />
/// <reference path="../Common/Thread.ts" />
/// <reference path="Comparison.ts" />
/// <reference path="Constants.ts" />
var Helper;
(function (Helper) {
    "use strict";
    var Comparison = Helper.Comparison;
    var Constants = Helper.Constants;
    class Utils {
        static init() {
            for (var i = 0; i < Utils.tableLength; i++) {
                Utils.sinTable[i] = Math.sin(2 * Math.PI * i / Utils.tableLength);
                Utils.cosTable[i] = Math.cos(2 * Math.PI * i / Utils.tableLength);
            }
        }
        static fastCos(d) {
            return Utils.cosTable[Math.round(d * 100)];
        }
        static fastSin(d) {
            return Utils.sinTable[Math.round(d * 100)];
        }
        // hash fn from http://stackoverflow.com/a/7616484
        // effectively computes Java's String.hashCode
        static hash(str) {
            var hash = 0;
            if (str.length === 0) {
                return hash;
            }
            for (var i = 0; i < str.length; i++) {
                var chr = str.charCodeAt(i);
                /* tslint:disable no-bitwise */
                hash = ((hash << 5) - hash) + chr;
                hash |= 0; // Convert to 32bit integer
            }
            return hash;
        }
        static getTrait(a, t) {
            if (a === undefined || !a.isAgent) {
                return undefined;
            }
            else {
                return a.getTrait(t);
            }
        }
        static isNumeric(n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        }
        static random() {
            // return Math.random();
            // deterministic prng for testing: http://stackoverflow.com/a/19303725
            var x = Math.sin(Utils.randomSeed++) * 10000;
            return x - Math.floor(x);
        }
        static randomInteger(lower, upper) {
            return Math.floor((Utils.random() * (upper + 1 - lower)) + lower);
        }
        static round(num, places) {
            var base = Math.pow(10, places);
            return Math.round(num * base) / base;
        }
        static maxmin(name, a, b) {
            if (name === "larger of") {
                return Math.max(a, b);
            }
            else {
                return Math.min(a, b);
            }
        }
        static trig(name, x) {
            switch (name) {
                case "cos": return Math.cos(x * Math.PI / 180);
                case "sin": return Math.sin(x * Math.PI / 180);
                case "tan": return Math.tan(x * Math.PI / 180);
                case "arccos": return Math.acos(x) * 180 / Math.PI;
                case "arcsin": return Math.asin(x) * 180 / Math.PI;
                case "arctan": return Math.atan(x) * 180 / Math.PI;
                default: {
                    throw new Error(`Unexpected trig function name: ${name}`);
                }
            }
        }
        static limit(n, lower, upper) {
            return Math.max(lower, Math.min(upper, n));
        }
        static listContains(haystack, needle) {
            if (haystack.indexOf(needle) !== -1) {
                return true;
            }
            else {
                for (var candidate of haystack) {
                    if (Comparison.equals(needle, candidate)) {
                        return true;
                    }
                }
                return false;
            }
        }
        static listSplice(mode, index, toInsert, listInto) {
            if (mode === Constants.LIST_BEGINNING) {
                return toInsert.concat(listInto);
            }
            else if (mode === Constants.LIST_END) {
                return listInto.concat(toInsert);
            }
            else {
                var firstPartInto = listInto;
                var lastPartInto = firstPartInto.splice(index);
                var newList = firstPartInto.concat(toInsert);
                return newList.concat(lastPartInto);
            }
        }
        static listInsert(mode, index, item, list) {
            if (mode === Constants.LIST_BEGINNING) {
                list.splice(0, 0, item);
            }
            else if (mode === Constants.LIST_END) {
                list.splice(list.length, 0, item);
            }
            else {
                list.splice(index, 0, item);
            }
            return list;
        }
        static isValidDataType(dataType) {
            return (dataType === "data" || dataType === "agent" || dataType === "list");
        }
        static toColor(input) {
            if (input === "random_color") {
                return Utils.random() * 0xFFFFFF;
            }
            else {
                return Number(input);
            }
        }
        static guessType(input) {
            if (isNaN(Number(input))) {
                return input;
            }
            else {
                return Number(input);
            }
        }
        static isGeneratorSupported() {
            // http://stackoverflow.com/a/24966392
            /* tslint:disable no-eval */
            try {
                eval("(function*(){})()");
                return true;
            }
            catch (_) {
                return false;
            }
            /* tslint:enable no-eval */
        }
    }
    Utils.tableLength = 36000;
    Utils.sinTable = new Array(Utils.tableLength);
    Utils.cosTable = new Array(Utils.tableLength);
    Utils.randomSeed = 0;
    Helper.Utils = Utils;
})(Helper || (Helper = {}));
/// <reference path="../Helper/Utils.ts" />
/// <reference path="Agent.ts" />
/// <reference path="Thread.ts" />
var Common;
(function (Common) {
    "use strict";
})(Common || (Common = {}));
/// <reference path="../Helper/Utils.ts" />
/// <reference path="ASTNode.ts" />
/// <reference path="Breed.ts" />
var Common;
(function (Common) {
    "use strict";
    class State {
        static reset(hard) {
            Common.State.runnable = false;
            Common.State.collisionsLastRun = false;
            Common.State.pushedButtons.clear();
            Common.State.toggledButtons.clear();
            Common.State.pushButtonRunning.clear();
            Common.State.buttonMap = new Array();
            Common.State.procedureRoots = new Map();
            Common.State.procedureGenerators = new Map();
            Common.State.procedureFunctions = new Map();
            Common.State.collisionsOn = false;
            Common.State.binningOn = false;
            Common.State.collisionDict = new Map();
            Common.State.collisionFunctions = new Map();
            Common.State.collidingBreeds = new Set();
            Common.State.collidedBreeds = new Map();
            Common.State.jsGenerators = new Map();
            Common.State.jsFunctions = new Map();
            Common.State.jsBtnNames = new Map();
            Common.State.variables = new Map();
            if (hard) {
                Common.State.clock = 0;
                Common.State.lastRunTime = (new Date()).getTime();
            }
        }
    }
    State.isTest = false;
    State.iterationLimit = 10000;
    State.runnable = false;
    State.collisionsLastRun = false;
    State.pushedButtons = new Set();
    State.toggledButtons = new Set();
    State.pushButtonRunning = new Map();
    State.buttonMap = new Array();
    /** This dictionary stores the locations of each procedure list and logic sublist
     *  in the procedureList
     */
    State.procedureRoots = new Map();
    State.procedureGenerators = new Map();
    State.procedureFunctions = new Map();
    // The collisionDict stores the IASTNodes associated with each collision block.
    State.collisionsOn = false;
    State.binningOn = false;
    State.collisionDict = new Map();
    State.collisionFunctions = new Map();
    State.collidingBreeds = new Set();
    State.collidedBreeds = new Map();
    State.jsGenerators = new Map();
    State.jsFunctions = new Map();
    State.jsBtnNames = new Map();
    State.clock = 0;
    State.lastRunTime = (new Date()).getTime();
    State.hasSmell = false;
    // Map of variable name to the initial value
    State.variables = new Map();
    Common.State = State;
})(Common || (Common = {}));
var DataStructures;
(function (DataStructures) {
    "use strict";
    class BlockPacket {
        /**
         * BlockPacket stores the information read from the JavaScript
         * to create a block in ActionScript
         * @param name:String the name of the block
         * @param id:int the JS ID of the block
         * @param label:String the label of the block, null if block is uneditable
         */
        constructor(name, id, label) {
            this.name = name;
            this.id = id;
            this.label = label;
        }
        getName() {
            return this.name;
        }
        getID() {
            return this.id;
        }
        /**
         * @returns the label of an editable block, e.g. the number typed in a number block
         */
        getLabel() {
            return this.label;
        }
    }
    DataStructures.BlockPacket = BlockPacket;
})(DataStructures || (DataStructures = {}));
var Helper;
(function (Helper) {
    "use strict";
    class Logger {
        static enable() {
            Helper.Logger.enabled = true;
        }
        static disable() {
            Helper.Logger.enabled = false;
        }
        static log(output) {
            if (Helper.Logger.enabled) {
                console.log(output);
            }
        }
        static mustLog(output) {
            console.log(output);
            Helper.Logger.lastBlockPrint = output;
            Helper.Logger.allPrinted.push(output);
        }
        static debug(output) {
            console.debug(output);
        }
        static error(output) {
            console.error(output);
        }
        static assert(test) {
            console.assert(test);
        }
    }
    Logger.allPrinted = new Array();
    Logger.enabled = false;
    Helper.Logger = Logger;
})(Helper || (Helper = {}));
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../Common/Thread.ts" />
/// <reference path="../../Helper/Logger.ts" />
/// <reference path="../../Helper/Utils.ts" />
var Execution;
(function (Execution) {
    var Threads;
    (function (Threads) {
        "use strict";
        var Logger = Helper.Logger;
        class FunctionRepeatThread {
            constructor(agent, buttonName, fun) {
                this.yielded = false;
                this.agent = agent;
                this.buttonName = buttonName;
                this.fun = fun;
                this.scope = new Map();
            }
            step() {
                // Logger.log(`Stepping through thread ${this} of agent ${this.agent}`);
                this.fun(this.agent, this);
                return false;
            }
            restart() {
                // Logger.log(`Restarting thread ${this} for agent ${this.agent}`);
            }
        }
        Threads.FunctionRepeatThread = FunctionRepeatThread;
    })(Threads = Execution.Threads || (Execution.Threads = {}));
})(Execution || (Execution = {}));
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../Common/State.ts" />
/// <reference path="../../Common/Thread.ts" />
/// <reference path="../../Helper/Logger.ts" />
/// <reference path="../../Helper/Utils.ts" />
var Execution;
(function (Execution) {
    var Threads;
    (function (Threads) {
        "use strict";
        var Logger = Helper.Logger;
        var State = Common.State;
        class GeneratorRepeatThread {
            constructor(agent, buttonName, genFunc) {
                this.yielded = false;
                this.buttonName = buttonName;
                this.agent = agent;
                this.scope = new Map();
                this.genFunc = genFunc;
                this.gen = genFunc(agent, this);
            }
            step() {
                // Logger.log(`Stepping through thread ${this} of agent ${this.agent}`);
                var out = this.gen[Symbol.iterator]().next();
                // Logger.log(`done: ${out.done}, value: ${out.value}`);
                if (out.done) {
                    this.gen = this.genFunc(this.agent, this);
                    this.yielded = false;
                }
                else {
                    this.yielded = true;
                    State.pushButtonRunning.set(this.buttonName, true);
                }
                return false;
            }
            restart() {
                this.gen = this.genFunc(this.agent, this);
                this.yielded = false;
            }
        }
        Threads.GeneratorRepeatThread = GeneratorRepeatThread;
    })(Threads = Execution.Threads || (Execution.Threads = {}));
})(Execution || (Execution = {}));
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../Helper/Utils.ts" />
var Execution;
(function (Execution) {
    var Threads;
    (function (Threads) {
        "use strict";
        class CollisionThread {
            constructor(agent, genFunc, collidee) {
                this.yielded = true;
                this.buttonName = "__wl_collision";
                this.scope = new Map();
                this.agent = agent;
                this.collidee = collidee;
                this.gen = genFunc(agent, this);
            }
            step() {
                this.agent.collidee = this.collidee;
                var out = this.gen[Symbol.iterator]().next();
                this.agent.collidee = undefined;
                return out.done;
            }
        }
        Threads.CollisionThread = CollisionThread;
    })(Threads = Execution.Threads || (Execution.Threads = {}));
})(Execution || (Execution = {}));
/// <reference path="../Common/Agent.ts" />
/// <reference path="../Common/ASTNode.ts" />
/// <reference path="../Common/Thread.ts" />
/// <reference path="../Common/State.ts" />
/// <reference path="../Execution/Threads/FunctionRepeatThread.ts" />
/// <reference path="../Execution/Threads/GeneratorRepeatThread.ts" />
/// <reference path="../Execution/Threads/CollisionThread.ts" />
/// <reference path="../Helper/Constants.ts" />
/// <reference path="../Helper/Logger.ts" />
/// <reference path="../Helper/Utils.ts" />
var DataStructures;
(function (DataStructures) {
    "use strict";
    var State = Common.State;
    var CollisionThread = Execution.Threads.CollisionThread;
    var Constants = Helper.Constants;
    var Logger = Helper.Logger;
    var Utils = Helper.Utils;
    class ASTList {
        constructor(n) {
            this.data = new Array(n || 0);
        }
        setup() {
            for (var idx = 0; idx < this.data.length; idx++) {
                var node = this[idx];
                if (node === undefined) {
                    this[idx] = new UtilEvalData("", true);
                }
                else {
                    node.setup();
                }
            }
        }
        check(lists, nodes) {
            // Logger.assert(!lists.has(this));
            for (var node of this.data) {
                node.check(lists, nodes);
            }
        }
        can_yield(procs) {
            for (var node of this.data) {
                if (node !== undefined && node.can_yield(procs)) {
                    return true;
                }
            }
            return false;
        }
        to_js() {
            var statements = new Array();
            for (var node of this.data) {
                if (node.can_yield(new Set())) {
                    statements.push(node.to_js_setup());
                    statements.push(node.to_js_final());
                }
                else {
                    statements.push(node.to_js_no_yield());
                }
            }
            return statements.join(";\n") + ";";
        }
    }
    DataStructures.ASTList = ASTList;
    class ASTNode {
        constructor(numArgs, numBranches) {
            this.id = ++ASTNode.idBase;
            this.numArgs = numArgs;
            this.numBranches = numBranches;
            this.args = new ASTList(numArgs);
            this.branches = new Array(numBranches);
            for (var i = 0; i < numBranches; i++) {
                this.branches[i] = new ASTList(0);
            }
        }
        can_yield(procs) {
            if (!State.generatorSupported) {
                return false;
            }
            if (this.args.can_yield(procs)) {
                return true;
            }
            for (var branch of this.branches) {
                if (branch.can_yield(procs)) {
                    return true;
                }
            }
            return false;
        }
        // rets is an array of length 2 [retval, retcode]
        // retval is the return value of the function (undefined if the function is void)
        // if retcode >= 0, we run the (retcode)th branch
        // if retcode == Constants.AST_REPEAT (-1), we rerun this function (useful for looping)
        // if retcode == Constants.AST_SLEEP (-2), we put this function to sleep
        fn(a, scope, args, rets) {
            throw new Error("unimplemented fn for ${this.constructor.name}");
        }
        ;
        to_js_no_yield() {
            throw new Error(`unimplemented to_js_no_yield for ${this.constructor.name}`);
        }
        to_js_setup() {
            throw new Error(`unimplemented to_js_setup for ${this.constructor.name}`);
        }
        to_js_final() {
            throw new Error(`unimplemented to_js_final for ${this.constructor.name}`);
        }
        setup() {
            this.args.setup();
            for (var branch of this.branches) {
                branch.setup();
            }
        }
        check(lists, nodes) {
            if (lists === undefined) {
                lists = new Set();
            }
            if (nodes === undefined) {
                nodes = new Set();
            }
            // Logger.assert(this.numArgs === this.args.data.length);
            // Logger.assert(this.numBranches === this.branches.length);
            // Logger.assert(!nodes.has(this));
            this.args.check(lists, nodes);
            for (var branch of this.branches) {
                branch.check(lists, nodes);
            }
        }
        make_collision_thread(a, b) {
            // Logger.assert(this.yields === true);
            return new CollisionThread(a, State.jsGenerators.get(this), b);
        }
        make_function() {
            var f;
            /* tslint:disable no-eval */
            eval(`f = function(__wl_agt, __wl_thd){ ${this.to_js_no_yield()};}`);
            /* tslint:enable no-eval */
            return f;
        }
        make_generator() {
            var g;
            /* tslint:disable no-eval */
            eval(`g = function*(__wl_agt, __wl_thd){ ${this.to_js_setup()}; ${this.to_js_final()};}`);
            /* tslint:enable no-eval */
            return g;
        }
    }
    ASTNode.state = new Map();
    ASTNode.idBase = 0;
    DataStructures.ASTNode = ASTNode;
    class UtilEvalData extends ASTNode {
        constructor(data, error) {
            super(0, 0); // numArgs = 0, numBranches = 0
            this.data = data;
            this.error = error;
        }
        fn(a, scope, args, rets) {
            if (this.error) {
                Logger.error("Empty socket");
            }
            rets[0] = this.data;
            rets[1] = Constants.AST_DONE;
        }
        to_js_no_yield() {
            if (Utils.isNumeric(this.data)) {
                return `${Number(this.data)}`;
            }
            else {
                return `"${this.data}"`;
            }
        }
        to_js_setup() {
            return "";
        }
        to_js_final() {
            if (Utils.isNumeric(this.data)) {
                return `${Number(this.data)}`;
            }
            else {
                return `"${this.data}"`;
            }
        }
        getData() {
            if (Utils.isNumeric(this.data)) {
                return Number(this.data);
            }
            else {
                return this.data;
            }
        }
    }
    DataStructures.UtilEvalData = UtilEvalData;
})(DataStructures || (DataStructures = {}));
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../Common/State.ts" />
/// <reference path="../../Common/Thread.ts" />
/// <reference path="../../Helper/Logger.ts" />
var Execution;
(function (Execution) {
    var Threads;
    (function (Threads) {
        "use strict";
        var State = Common.State;
        var Logger = Helper.Logger;
        class SetupThread {
            constructor(agent, genFunc, parentThread) {
                this.yielded = true;
                this.buttonName = "__wl_setup";
                this.buttonName = parentThread.buttonName;
                this.gen = genFunc(agent, this);
                this.agent = agent;
                this.scope = parentThread.scope;
            }
            step() {
                // Logger.log(`Stepping through setup thread ${this} of agent ${this.agent}`);
                var out = this.gen[Symbol.iterator]().next();
                if (!out.done) {
                    State.pushButtonRunning.set(this.buttonName, true);
                }
                // Logger.log(`done: ${out.done}, value: ${out.value}`);
                return out.done;
            }
        }
        Threads.SetupThread = SetupThread;
    })(Threads = Execution.Threads || (Execution.Threads = {}));
})(Execution || (Execution = {}));
/// <reference path="../../Common/Thread.ts" />
var Execution;
(function (Execution) {
    var Threads;
    (function (Threads) {
        "use strict";
        class SingleFunctionThread {
            constructor(parentThread) {
                this.yielded = false;
                if (parentThread !== undefined) {
                    this.buttonName = parentThread.buttonName;
                    this.scope = parentThread.scope;
                }
            }
            step() {
                throw new Error("unimplemented");
            }
        }
        Threads.SingleFunctionThread = SingleFunctionThread;
    })(Threads = Execution.Threads || (Execution.Threads = {}));
})(Execution || (Execution = {}));
/// <reference path="../DataStructures/AST.ts" />
/// <reference path="../Execution/Threads/SetupThread.ts" />
/// <reference path="../Execution/Threads/SingleFunctionThread.ts" />
/// <reference path="../Execution/AgentState.ts" />
/// <reference path="../Common/Agent.ts" />
/// <reference path="../Common/Thread.ts" />
/// <reference path="../Common/Breed.ts" />
/// <reference path="../Common/Trait.ts" />
/// <reference path="../Helper/Constants.ts" />
/// <reference path="../Helper/Utils.ts" />
var Execution;
(function (Execution) {
    "use strict";
    var Breed = Common.Breed;
    var SetupThread = Execution.Threads.SetupThread;
    var SingleFunctionThread = Execution.Threads.SingleFunctionThread;
    var Constants = Helper.Constants;
    class AgentController {
        constructor() {
            throw new Error("Cannot instantiate static class");
        }
        static insert(agent) {
            var index = Execution.AgentController.numAgents;
            if (Execution.AgentController.numAgents >= Execution.AgentController.data.length) {
                Execution.AgentController.data.length *= 2;
                Execution.AgentController.states.length *= 2;
                Execution.AgentController.prevStates.length *= 2;
            }
            Execution.AgentController.breedList[agent.breed.id].add(agent);
            Execution.AgentController.data[index] = agent;
            Execution.AgentController.states[index] = agent.state;
            Execution.AgentController.prevStates[index] = agent.prevState;
            Execution.AgentController.indexMap.set(agent, index);
            Execution.AgentController.numAgents++;
        }
        static spawn(a, n, b, t, g) {
            var interval = 360. / n;
            for (var i = 0; i < n; i++) {
                var child = a.clone(b);
                child.safeSetHeading(i * interval);
                child.prevState.heading = child.state.heading;
                if (g) {
                    var childThread = new SetupThread(child, g, t);
                    var done = childThread.step();
                    if (!done) {
                        child.jsthreads.push(childThread);
                    }
                }
                child.updateBin();
            }
        }
        static spawn_fun(a, n, b, t, f) {
            var interval = 360. / n;
            var sft = new SingleFunctionThread(t);
            for (var i = 0; i < n; i++) {
                var child = a.clone(b);
                child.state.heading += i * interval;
                child.prevState.heading = child.state.heading;
                if (f !== undefined) {
                    f(child, sft);
                }
                child.updateBin();
            }
        }
        static remove(agent) {
            Execution.AgentController.deadAgents.push(agent);
            Execution.Collisions.remove(agent);
        }
        static clearDead() {
            /* tslint:disable no-var-keyword */
            for (var i = 0; i < Execution.AgentController.deadAgents.length; i++) {
                var agent = Execution.AgentController.deadAgents[i];
                /* tslint:disable no-var-keyword */
                var index = Execution.AgentController.indexMap.get(agent);
                var lastIndex = Execution.AgentController.numAgents - 1;
                var lastAgent = Execution.AgentController.data[lastIndex];
                if (index !== lastIndex) {
                    Execution.AgentController.indexMap.set(lastAgent, index);
                    Execution.AgentController.data[index] = lastAgent;
                    Execution.AgentController.states[index] = lastAgent.state;
                    Execution.AgentController.prevStates[index] = lastAgent.prevState;
                }
                Execution.AgentController.data[lastIndex] = undefined;
                Execution.AgentController.states[lastIndex] = undefined;
                Execution.AgentController.prevStates[lastIndex] = undefined;
                Execution.AgentController.indexMap.delete(agent);
                var breedList = Execution.AgentController.breedList[agent.breed.id];
                breedList.delete(agent);
                Execution.AgentController.numAgents--;
            }
            Execution.AgentController.deadAgents = new Array();
            if (Execution.AgentController.numAgents <= Execution.AgentController.data.length / 2 && Execution.AgentController.numAgents > 1024) {
                Execution.AgentController.data.length /= 2;
                Execution.AgentController.states.length /= 2;
                Execution.AgentController.prevStates.length /= 2;
            }
        }
        static reset(hard) {
            Execution.Collisions.reset();
            Execution.AgentController.data = new Array(1024);
            Execution.AgentController.states.splice(1);
            Execution.AgentController.states.length = 1024;
            Execution.AgentController.prevStates.splice(1);
            Execution.AgentController.prevStates.length = 1024;
            Execution.AgentController.numAgents = 1;
            Execution.AgentController.worldInstance.jsthreads = [];
            Execution.AgentController.data[0] = Execution.AgentController.worldInstance;
            Execution.AgentController.states[0] = Execution.AgentController.worldInstance.state;
            Execution.AgentController.prevStates[0] = Execution.AgentController.worldInstance.prevState;
            if (hard) {
                Execution.AgentController.breedList = [new Set(), new Set()];
                Execution.AgentController.namedBreeds = new Map([
                    [Execution.AgentController.EVERYONE.name, Execution.AgentController.EVERYONE],
                    [Execution.AgentController.WORLD.name, Execution.AgentController.WORLD],
                ]);
                Execution.AgentController.breeds = new Map([
                    [Execution.AgentController.EVERYONE.id, Execution.AgentController.EVERYONE],
                    [Execution.AgentController.WORLD.id, Execution.AgentController.WORLD],
                ]);
            }
        }
        static getAllAgents(skipWorld, breed) {
            if (breed !== undefined) {
                if (Execution.AgentController.breedList[breed.id] !== undefined) {
                    return Array.from(Execution.AgentController.breedList[breed.id]);
                }
                else {
                    return [];
                }
            }
            var allAgents = new Array();
            var worldID = Execution.AgentController.worldInstance.id;
            for (var i = 0, len = Execution.AgentController.data.length; i < len; i++) {
                var agent = Execution.AgentController.data[i];
                if (agent !== undefined) {
                    if (!skipWorld || agent.id !== worldID) {
                        allAgents.push(agent);
                    }
                }
            }
            return allAgents;
        }
        static scatterAllAgents() {
            for (var a of Execution.AgentController.getAllAgents(true)) {
                a.scatter();
            }
        }
        static getByName(name) {
            return Execution.AgentController.namedBreeds.get(name);
        }
        static getBreeds() {
            return Array.from(Execution.AgentController.namedBreeds.keys());
        }
        static getBreedIDs(includeAll) {
            var breedIDs = Array.from(Execution.AgentController.breeds.keys());
            if (!includeAll) {
                breedIDs.splice(breedIDs.indexOf(Execution.AgentController.WORLD.id), 1);
                breedIDs.splice(breedIDs.indexOf(Execution.AgentController.EVERYONE.id), 1);
            }
            return breedIDs;
        }
        static getReadableTraits(breedName) {
            var breed = Execution.AgentController.getByName(breedName);
            var traits = breed.getReadableTraits();
            return traits;
        }
        static getChangeableTraits(breedName) {
            var breed = Execution.AgentController.getByName(breedName);
            var traits = breed.getChangeableTraits();
            return traits;
        }
        static getCustomTraits(breedName) {
            var breed = Execution.AgentController.getByName(breedName);
            var traits = breed.getCustomTraits();
            return traits;
        }
        // Adds a new trait to a breed, and all members of that breed
        // @return true if the trait was added, false if the trait already existed or could not be added
        static addTrait(breedName, trait, dataType, dv) {
            var breed = Execution.AgentController.getByName(breedName);
            var success = breed.addTrait(trait, dataType, dv);
            if (success) {
                var traitID = breed.getTraitID(trait);
                for (var agent of Execution.AgentController.getAllAgents(false, breed)) {
                    agent.traits[traitID] = dv;
                }
            }
            return success;
        }
        static renameTrait(breedName, oldName, newName, dv) {
            var breed = Execution.AgentController.getByName(breedName);
            return breed.renameTrait(oldName, newName, dv);
        }
        static removeTrait(breedName, trait) {
            var breed = Execution.AgentController.getByName(breedName);
            var traitID = breed.getTraitID(trait);
            var success = breed.removeTrait(trait);
            if (success) {
                for (var agent of Execution.AgentController.getAllAgents(false, breed)) {
                    delete (agent.traits[traitID]);
                }
            }
            return success;
        }
        static addBreed(breedName) {
            if (breedName === "" || Execution.AgentController.namedBreeds.has(breedName)) {
                return undefined;
            }
            var breed = new Breed(breedName);
            Execution.AgentController.breeds.set(breed.id, breed);
            Execution.AgentController.namedBreeds.set(breed.name, breed);
            Execution.AgentController.breedList[breed.id] = new Set();
            return breed.id;
        }
        // Rename the trait from oldName to newName, if possible
        static renameBreed(oldName, newName) {
            // only rename if the old breed exists and the new one doesn't yet
            if (!Execution.AgentController.namedBreeds.has(oldName) || Execution.AgentController.namedBreeds.has(newName) || newName === "") {
                return false;
            }
            var breed = Execution.AgentController.getByName(oldName);
            Execution.AgentController.namedBreeds.delete(oldName);
            breed.name = newName;
            Execution.AgentController.namedBreeds.set(newName, breed);
            return true;
        }
        // Attempts to remove the given breed from existence, including deleting
        // all agents of the breed and all traits associated with it.
        static removeBreed(breedName) {
            if (!Execution.AgentController.namedBreeds.has(breedName)) {
                return undefined;
            }
            var breed = Execution.AgentController.getByName(breedName);
            for (var agent of Execution.AgentController.getAllAgents(false, breed)) {
                agent.die();
            }
            Execution.AgentController.namedBreeds.delete(breed.name);
            Execution.AgentController.breeds.delete(breed.id);
            return breed.id;
        }
    }
    AgentController.WORLD = new Breed(Constants.WORLD);
    AgentController.EVERYONE = new Breed(Constants.EVERYONE);
    AgentController.namedBreeds = new Map([
        [AgentController.EVERYONE.name, AgentController.EVERYONE],
        [AgentController.WORLD.name, AgentController.WORLD],
    ]);
    AgentController.breeds = new Map([
        [AgentController.EVERYONE.id, AgentController.EVERYONE],
        [AgentController.WORLD.id, AgentController.WORLD],
    ]);
    AgentController.breedList = [new Set(), new Set()];
    AgentController.deadAgents = new Array();
    AgentController.indexMap = new Map();
    AgentController.numAgents = 0;
    AgentController.data = new Array(1024);
    AgentController.states = new Array(1024);
    AgentController.prevStates = new Array(1024);
    Execution.AgentController = AgentController;
})(Execution || (Execution = {}));
/// <reference path="../DataStructures/BlockPacket.ts" />
var Common;
(function (Common) {
    "use strict";
})(Common || (Common = {}));
/// <reference path="../DataStructures/BlockPacket.ts" />
/// <reference path="../Helper/Logger.ts" />
/// <reference path="../Common/IWebLogo.ts" />
var Compilation;
(function (Compilation) {
    "use strict";
    var BlockPacket = DataStructures.BlockPacket;
    var Logger = Helper.Logger;
    class BlocksReader {
        /**
         * Returns the page names from the main application
         */
        static getPages() {
            return Compilation.BlocksReader.app.appGetPages();
        }
        /**
         * Returns the top block packets in the JS, i.e. packets of blocks without parents
         * @returns A list of the top blocks, in BlockPacket form
         */
        static getTopBlocks() {
            var blocks = new Array();
            for (var packet of Compilation.BlocksReader.app.appGetTopBlocks()) {
                blocks.push(packet);
            }
            return blocks;
        }
        /**
         * Returns a list of all block packets with the given name
         * @param blockName:String the block name to search for on the canvas
         */
        static getNamedBlocks(blockName) {
            return Compilation.BlocksReader.app.appGetNamedBlocks(blockName);
        }
        /**
         * Returns the child block of a given block at a given socket and position.
         * @param blockID: Block the parent block
         * @param socket: number which socket to look into
         * @param socketIndex: number the position of the desired block in the given socket, defaults to 0
         * @param isOptional: Boolean defaults to false, but must be true if an argument can be undefined without error
         * @returns Block the desired child block of the given parent block, or undefined if it doesn't exist
         * @throws EmptySocketError if the requested socket is required, but undefined
         */
        static getSB(blockID, socket, isOptional, socketIndex) {
            socketIndex = socketIndex || 0;
            // Logger.log("Starting getSB.  blockID: <${blockID}>; socket: <${socket}>; socketIndex: <${socketIndex}>");
            var socketPacket = Compilation.BlocksReader.app.appGetSB(blockID, socket, socketIndex);
            /*
              IWebLogo.printToJSConsole("Name is " + socketPacket.getName())
              IWebLogo.printToJSConsole("Label is " + socketPacket.getLabel())
              IWebLogo.printToJSConsole("ID is " + socketPacket.getID())
            */
            if (socketPacket && socketPacket.getName() === "emptyCommand") {
                // Logger.log("In the if");
                var page = Compilation.BlocksReader.app.appGetPageName(blockID);
                // Logger.log(`block: <${blockID}> socket: <${socket}> in page: <${page}>`);
                // var e:EmptySocketError = new EmptySocketError(blockID, page);
                // throw e;
                return undefined;
            }
            else if (isOptional || socketPacket !== undefined) {
                // Logger.log("In the else if");
                return socketPacket;
            }
            else {
                var page = Compilation.BlocksReader.app.appGetPageName(blockID);
                // Logger.log("Testing page " + page);
                if (page === undefined || page === "undefined" || !page) {
                    // Logger.log("In the if " + Compilation.BlocksReader.app.appGetCurrentPage());
                    page = Compilation.BlocksReader.app.appGetCurrentPage();
                }
                // Logger.log("page is now " + page);
                /*let e:EmptySocketError = new EmptySocketError(blockID, page);
                IWebLogo.printToJSConsole("block: "  +  blockID  +  " socket: " + socket  +  " in page: "  +  page);
                throw e;*/
                var blockName = Compilation.BlocksReader.app.appGetBlock(blockID).getName();
                // Logger.log("In the else");
                return new BlockPacket("error", -Number(String(blockID) + String(socket)), blockName + "$" + page);
            }
        }
        /**
         * Returns the number of sockets in a given block
         * @param blockID: ID of the block searching for
         */
        static getSBLength(blockID) {
            return Compilation.BlocksReader.app.appGetSBLength(blockID);
        }
        static getBlock(blockID) {
            return Compilation.BlocksReader.app.appGetBlock(blockID);
        }
        /**
         * Returns the block after the given block
         * @param block: the block above the desired block
         * @returns Block representing the after block, or undefined if there is no block
         * after the given one
         */
        static getAfterBlock(blockPacket) {
            return Compilation.BlocksReader.app.appGetAfterBlock(blockPacket.getID());
        }
        /**
         * Returns the block before the given block
         * @param block: the block below the desired block
         * @returns Block representing the before block, or undefined if there is no block
         * before the given one
         */
        static getBeforeBlock(blockPacket) {
            var beforePacket = Compilation.BlocksReader.app.appGetBeforeBlock(blockPacket.getID());
            if (beforePacket !== undefined) {
                return beforePacket;
            }
            return undefined;
        }
        /**
         * Returns the block that is the parent of the given block
         * @param block: the block
         * @returns Block representing the parent block, or undefined if there is no block
         */
        static getParentBlock(blockPacket) {
            var parentPacket = Compilation.BlocksReader.app.appGetParent(blockPacket.getID());
            if (parentPacket !== undefined) {
                return parentPacket;
            }
            return undefined;
        }
        /**
         * @returns the name of the page this block is on, or "" if no page
         */
        static getPageName(blockPacket) {
            var name = Compilation.BlocksReader.app.appGetPageName(blockPacket.getID());
            if (name === "") {
                // Logger.log("no page name for: " + blockPacket.toString());
            }
            return name;
        }
        static setApp(app) {
            Compilation.BlocksReader.app = app;
        }
        /**
         * Returns the argument inside an internal argument
         * @param blockID: number the id of the block with the parameter
         * @param socketIndex: number the socket number within the block
         */
        static getInternalArg(blockID, socketIndex) {
            var arg = Compilation.BlocksReader.app.appGetInternalArg(blockID, socketIndex);
            return arg;
        }
        /**
         * Returns the label of the given block
         * @param blockID: number the block of which the label will be returned
         * @returns String the label of the block
         */
        static getLabel(blockID, socket) {
            return Compilation.BlocksReader.app.appGetLabel(blockID, socket);
        }
        /**
         * Alerts ScriptBlocks of changes that occurred in WebLogo and affect blocks or pages
         * @param args: Map<string, any> contains any arguments ScriptBlocks needs to handle the dispatched event. Keys include
         * "category":"breed", "trait", "widget" for a changing object
         * "event":"add", "delete", "change" for the type of change occurring
         * "name/breed/oldName/newName" to specify the details of the change
         */
        static dispatchEvent(args) {
            Compilation.BlocksReader.app.dispatchToJS(args);
        }
    }
    Compilation.BlocksReader = BlocksReader;
})(Compilation || (Compilation = {}));
/// <reference path="../DataStructures/BlockPacket.ts" />
/// <reference path="../DataStructures/AST.ts" />
/// <reference path="../Compilation/BlocksReader.ts" />
var Common;
(function (Common) {
    "use strict";
    var BlocksReader = Compilation.BlocksReader;
    class Procedure {
        constructor(name) {
            this.params = new Array();
            this.calls = new Set();
            this.id = ++Procedure.idBase;
            this.name = name;
        }
        static makeNew(name) {
            var proc = new Common.Procedure(name);
            Common.Procedure.namedProcedures.set(name, proc);
            Common.Procedure.procedures.set(proc.id, proc);
            return proc;
        }
        static getByName(name) {
            return Common.Procedure.namedProcedures.get(name);
        }
        static rename(oldName, newName) {
            if (oldName === newName) {
                return;
            }
            if (!Common.Procedure.namedProcedures.has(oldName) || Common.Procedure.namedProcedures.has(newName)) {
                throw new Error("Error renaming procedure");
            }
            var procedure = Common.Procedure.namedProcedures.get(oldName);
            procedure.name = newName;
            Common.Procedure.namedProcedures.set(newName, procedure);
        }
        getNewParams(blockID) {
            var sbLength = BlocksReader.getSBLength(blockID);
            var paramNames = [];
            for (var idx = 0; idx < Math.floor(sbLength / 3) - 1; idx++) {
                var socketIdx = 2 + 3 * idx;
                paramNames.push(BlocksReader.getSB(blockID, socketIdx).getLabel());
            }
            return paramNames;
        }
        getNewLabels(blockID) {
            var sbLength = BlocksReader.getSBLength(blockID);
            var frontLabels = sbLength - (sbLength % 3) - 1;
            var labels = new Array(frontLabels);
            for (var idx = 0; idx < frontLabels; idx++) {
                var bp = BlocksReader.getSB(blockID, idx);
                if (bp !== undefined) {
                    labels[idx] = bp.getLabel();
                }
            }
            if (sbLength % 3 === 2) {
                var bp = BlocksReader.getSB(blockID, sbLength - 1);
                labels.push(bp.getLabel());
            }
            return labels;
        }
    }
    Procedure.idBase = 0;
    Procedure.namedProcedures = new Map();
    Procedure.procedures = new Map();
    Common.Procedure = Procedure;
})(Common || (Common = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../DataStructures/AST.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class AgtCreate extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var numAgents = Number(args[0]);
                var breed = String(args[1]);
                var interval = 360. / numAgents;
                for (var i = 0; i < numAgents; i++) {
                    var child = a.clone(breed);
                    // Give them evenly spaced headings
                    child.safeSetHeading(i * interval);
                    // don't tween the heading change; they're "born" facing this way
                    child.prevState.heading = child.state.heading;
                }
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Execution.AgentController.spawn(__wl_agt,
                                        ${this.args.data[0].to_js_no_yield()},
                                        ${this.args.data[1].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        var __wl_${this.id}_num_agents = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_breed = ${this.args.data[1].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        Execution.AgentController.spawn(__wl_agt, __wl_${this.id}_num_agents, __wl_${this.id}_breed);
      `;
            }
        }
        Instructions.AgtCreate = AgtCreate;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        class SingleBranch extends ASTNode {
            constructor(branch) {
                super(0, 1); // numArgs = 0, numBranches = 1
                this.branches[0] = branch;
            }
            fn(a, scope, args, rets) {
                rets[0] = 0;
                rets[1] = 0;
            }
            to_js_no_yield() {
                return `
        ${this.branches[0].to_js()}
      `;
            }
            to_js_setup() {
                return ``;
            }
            to_js_final() {
                return `
        ${this.branches[0].to_js()};
      `;
            }
        }
        Instructions.SingleBranch = SingleBranch;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../Helper/Utils.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../Execution/AgentController.ts" />
/// <reference path="SingleBranch" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        var SingleBranch = Compilation.Instructions.SingleBranch;
        class AgtCreateDo extends ASTNode {
            constructor() {
                super(2, 1); // numArgs = 2, numBranches = 1
            }
            fn(a, scope, args, rets) {
                var numAgents = Number(args[0]);
                var breed = String(args[1]);
                var interval = 360. / numAgents;
                for (var i = 0; i < numAgents; i++) {
                    var child = a.clone(breed);
                    // Give them evenly spaced headings
                    child.safeSetHeading(a.state.heading + (i * interval));
                    // don't tween the heading change; they're "born" facing this way
                    child.prevState.heading = child.state.heading;
                }
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                var fun = (new SingleBranch(this.branches[0])).make_function();
                return `
        Execution.AgentController.spawn_fun(__wl_agt, ${this.args.data[0].to_js_no_yield()},
                                            ${this.args.data[1].to_js_no_yield()}, __wl_thd, ${fun});
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        var __wl_${this.id}_agts = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_breed = ${this.args.data[1].to_js_final()};
      `;
            }
            to_js_final() {
                var gen = (new SingleBranch(this.branches[0])).make_generator();
                return `
        Execution.AgentController.spawn(__wl_agt, __wl_${this.id}_agts, __wl_${this.id}_breed,
                                        __wl_thd, ${gen});
      `;
            }
        }
        Instructions.AgtCreateDo = AgtCreateDo;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class AgtDelete extends ASTNode {
            constructor() {
                super(0, 0); // numArgs = 0, numBranches = 0
            }
            fn(a, scope, args, rets) {
                a.die();
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        __wl_agt.die()
      `;
            }
            to_js_setup() {
                return ``;
            }
            to_js_final() {
                return `
        __wl_agt.die()
      `;
            }
        }
        Instructions.AgtDelete = AgtDelete;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class AgtDeleteAgent extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var target = args[0]; // this may be a copy of the agent so we need to get the original
                if (target.isSnapshot) {
                    target.original.die();
                }
                else {
                    target.die();
                }
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        var __wl_${this.id}_target = ${this.args.data[0].to_js_no_yield()};
        if (__wl_${this.id}_target !== undefined && __wl_${this.id}_target.isAgent) {
          if (__wl_${this.id}_target.isSnapshot) {
            __wl_${this.id}_target.original.die();
          } else {
            __wl_${this.id}_target.die();
          }
        }
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_target = ${this.args.data[0].to_js_no_yield()};
      `;
            }
            to_js_final() {
                return `
        if (__wl_${this.id}_target !== undefined && __wl_${this.id}_target.isAgent) {
          if (__wl_${this.id}_target.isSnapshot) {
            __wl_${this.id}_target.original.die();
          } else {
            __wl_${this.id}_target.die();
          }
        }
      `;
            }
        }
        Instructions.AgtDeleteAgent = AgtDeleteAgent;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../Execution/AgentController.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        var AgentController = Execution.AgentController;
        class AgtDeleteEveryone extends ASTNode {
            constructor() {
                super(0, 0); // numArgs = 0, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var skipWorld = true;
                for (var agt of AgentController.getAllAgents(skipWorld)) {
                    agt.die();
                }
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        for (var agt of Execution.AgentController.getAllAgents(true)) {
          agt.die();
        }
      `;
            }
            to_js_setup() {
                return ``;
            }
            to_js_final() {
                return `
        var __wl_${this.id}_skip_world: boolean = true;

        for (var agt of Execution.AgentController.getAllAgents(__wl_${this.id}_skip_world)) {
          agt.die();
        }
      `;
            }
        }
        Instructions.AgtDeleteEveryone = AgtDeleteEveryone;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class AgtMe extends ASTNode {
            constructor() {
                super(0, 0); // numArgs = 0, numBranches = 0
            }
            fn(a, scope, args, rets) {
                rets[0] = a;
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        __wl_agt
      `;
            }
            to_js_setup() {
                return ``;
            }
            to_js_final() {
                return `
        __wl_agt
      `;
            }
        }
        Instructions.AgtMe = AgtMe;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class AgtMyParent extends ASTNode {
            constructor() {
                super(0, 0); // numArgs = 0, numBranches = 0
            }
            fn(a, scope, args, rets) {
                rets[0] = a.parent;
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        __wl_agt.parent
      `;
            }
            to_js_setup() {
                return ``;
            }
            to_js_final() {
                return `
        __wl_agt.parent
      `;
            }
        }
        Instructions.AgtMyParent = AgtMyParent;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class CalcAbs extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var n = Number(args[0]);
                rets[0] = Math.abs(n);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Math.abs(${this.args.data[0].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_x = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        Math.abs(__wl_${this.id}_x)
      `;
            }
        }
        Instructions.CalcAbs = CalcAbs;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class CalcArcSinCosTan extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var mode = String(args[0]);
                var n = Number(args[1]);
                if (mode === "arcsin") {
                    rets[0] = Math.asin(n) * 180 / Math.PI;
                }
                else if (mode === "arccos") {
                    rets[0] = Math.acos(n) * 180 / Math.PI;
                }
                else if (mode === "arctan") {
                    rets[0] = Math.atan(n) * 180 / Math.PI;
                }
                else {
                    throw new Error(`Invalid mode: ${mode}`);
                }
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Helper.Utils.trig(${this.args.data[0].to_js_no_yield()}, ${this.args.data[1].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        var __wl_${this.id}_fn_name = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_x = ${this.args.data[1].to_js_final()};

        var __wl_${this.id}_fn;

        if (__wl_${this.id}_fn_name === "arccos") {
          __wl_${this.id}_fn = Math.acos;
        } else if (__wl_${this.id}_fn_name === "arcsin") {
          __wl_${this.id}_fn = Math.asin;
        } else if (__wl_${this.id}_fn_name === "arctan") {
          __wl_${this.id}_fn = Math.atan;
        }
      `;
            }
            to_js_final() {
                return `
        __wl_${this.id}_fn(__wl_${this.id}_x) * 180 / Math.PI
      `;
            }
        }
        Instructions.CalcArcSinCosTan = CalcArcSinCosTan;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class CalcDifference extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                rets[0] = args[0] - args[1];
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        (${this.args.data[0].to_js_no_yield()} - ${this.args.data[1].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        var __wl_${this.id}_a = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_b = ${this.args.data[1].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        __wl_${this.id}_a - __wl_${this.id}_b
      `;
            }
        }
        Instructions.CalcDifference = CalcDifference;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class CalcLn extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                rets[0] = Math.log(args[0]);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Math.log(${this.args.data[0].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_n = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        Math.log(__wl_${this.id}_n)
      `;
            }
        }
        Instructions.CalcLn = CalcLn;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class CalcLog extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var n = Number(args[0]);
                rets[0] = Math.log10(n);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Math.log10(${this.args.data[0].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_n = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        Math.log10(__wl_${this.id}_n)
      `;
            }
        }
        Instructions.CalcLog = CalcLog;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class CalcMaxMin extends ASTNode {
            constructor() {
                super(3, 0); // numArgs = 3, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var minMax = String(args[0]);
                var n2 = Number(args[1]);
                var n1 = Number(args[2]);
                if (minMax === "larger of") {
                    rets[0] = Math.max(n1, n2);
                }
                else {
                    rets[0] = Math.min(n1, n2);
                }
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Helper.Utils.maxmin(${this.args.data[0].to_js_no_yield()},
                            ${this.args.data[1].to_js_no_yield()},
                            ${this.args.data[2].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};
        ${this.args.data[2].to_js_setup()};

        var __wl_${this.id}_fn_name = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_a = ${this.args.data[1].to_js_final()};
        var __wl_${this.id}_b = ${this.args.data[2].to_js_final()};

        var __wl_${this.id}_fn;

        if (__wl_${this.id}_fn_name === "larger of") {
          __wl_${this.id}_fn = Math.max;
        } else {
          __wl_${this.id}_fn = Math.min;
        }
      `;
            }
            to_js_final() {
                return `
        __wl_${this.id}_fn(__wl_${this.id}_a, __wl_${this.id}_b)
      `;
            }
        }
        Instructions.CalcMaxMin = CalcMaxMin;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class CalcPower extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var n1 = args[0];
                var n2 = args[1];
                rets[0] = Math.pow(n1, n2);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Math.pow(${this.args.data[0].to_js_no_yield()}, ${this.args.data[1].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        var __wl_${this.id}_a = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_b = ${this.args.data[1].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        Math.pow(__wl_${this.id}_a, __wl_${this.id}_b)
      `;
            }
        }
        Instructions.CalcPower = CalcPower;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class CalcProduct extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var n1 = Number(args[0]);
                var n2 = Number(args[1]);
                rets[0] = n1 * n2;
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        (${this.args.data[0].to_js_no_yield()} * ${this.args.data[1].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        var __wl_${this.id}_a = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_b = ${this.args.data[1].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        __wl_${this.id}_a * __wl_${this.id}_b
      `;
            }
        }
        Instructions.CalcProduct = CalcProduct;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class CalcQuotient extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var n = Number(args[0]);
                var d = Number(args[1]);
                rets[0] = n / d;
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        (${this.args.data[0].to_js_no_yield()} / ${this.args.data[1].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        var __wl_${this.id}_a = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_b = ${this.args.data[1].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        __wl_${this.id}_a / __wl_${this.id}_b
      `;
            }
        }
        Instructions.CalcQuotient = CalcQuotient;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class CalcRemainder extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var n1 = Number(args[0]);
                var n2 = Number(args[1]);
                rets[0] = n1 % n2;
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        (${this.args.data[0].to_js_no_yield()} % ${this.args.data[1].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        var __wl_${this.id}_a = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_b = ${this.args.data[1].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        __wl_${this.id}_a % __wl_${this.id}_b
      `;
            }
        }
        Instructions.CalcRemainder = CalcRemainder;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class CalcRound extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var n = Number(args[0]);
                var precision = Number(args[1]);
                rets[0] = Math.round(n * Math.pow(10, precision)) / Math.pow(10, precision);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Helper.Utils.round(${this.args.data[0].to_js_no_yield()}, ${this.args.data[1].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        var __wl_${this.id}_x = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_base = Math.pow(10, ${this.args.data[1].to_js_final()});
      `;
            }
            to_js_final() {
                return `
        Math.round(__wl_${this.id}_x * __wl_${this.id}_base) / __wl_${this.id}_base;
      `;
            }
        }
        Instructions.CalcRound = CalcRound;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class CalcSquareRoot extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var n = Number(args[0]);
                rets[0] = Math.sqrt(n);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Math.sqrt(${this.args.data[0].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_x = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        Math.sqrt(__wl_${this.id}_x)
      `;
            }
        }
        Instructions.CalcSquareRoot = CalcSquareRoot;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class CalcSum extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                rets[0] = args[0] + args[1];
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        (${this.args.data[0].to_js_no_yield()} + ${this.args.data[1].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        var __wl_${this.id}_a = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_b = ${this.args.data[1].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        __wl_${this.id}_a + __wl_${this.id}_b
      `;
            }
        }
        Instructions.CalcSum = CalcSum;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class CalcTrigSinCosTan extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var mode = String(args[0]);
                var n = Number(args[1]);
                if (mode === "sin") {
                    rets[0] = Math.sin(n * Math.PI / 180);
                }
                else if (mode === "cos") {
                    rets[0] = Math.cos(n * Math.PI / 180);
                }
                else if (mode === "tan") {
                    rets[0] = Math.tan(n * Math.PI / 180);
                }
                else {
                    throw new Error(`Invalid mode: ${mode}`);
                }
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Helper.Utils.trig(${this.args.data[0].to_js_no_yield()}, ${this.args.data[1].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        var __wl_${this.id}_fn_name = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_x = ${this.args.data[1].to_js_final()};

        var __wl_${this.id}_fn;

        if (__wl_${this.id}_fn_name === "cos") {
          __wl_${this.id}_fn = Math.cos;
        } else if (__wl_${this.id}_fn_name === "sin") {
          __wl_${this.id}_fn = Math.sin;
        } else if (__wl_${this.id}_fn_name === "tan") {
          __wl_${this.id}_fn = Math.tan;
        }
      `;
            }
            to_js_final() {
                return `
        __wl_${this.id}_fn(__wl_${this.id}_x * Math.PI / 180)
      `;
            }
        }
        Instructions.CalcTrigSinCosTan = CalcTrigSinCosTan;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../Common/State.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        var State = Common.State;
        class Clock extends ASTNode {
            constructor() {
                super(0, 0); // numArgs = 0, numBranches = 0
            }
            fn(a, scope, args, rets) {
                rets[0] = State.clock;
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Common.State.clock
      `;
            }
            to_js_setup() {
                return ``;
            }
            to_js_final() {
                return `
        Common.State.clock
      `;
            }
        }
        Instructions.Clock = Clock;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../Common/State.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var State = Common.State;
        var Constants = Helper.Constants;
        class ClockSet extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                State.clock = Number(args[0]);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Common.State.clock = ${this.args.data[0].to_js_no_yield()}
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_clock = Number(${this.args.data[0].to_js_final()});
      `;
            }
            to_js_final() {
                return `
        Common.State.clock = __wl_${this.id}_clock;
      `;
            }
        }
        Instructions.ClockSet = ClockSet;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class Collidee extends ASTNode {
            constructor() {
                super(0, 0); // numArgs = 0, numBranches = 0
            }
            fn(a, scope, args, rets) {
                rets[0] = a.collidee;
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        __wl_agt.collidee
      `;
            }
            to_js_setup() {
                return ``;
            }
            to_js_final() {
                return `
        __wl_agt.collidee
      `;
            }
        }
        Instructions.Collidee = Collidee;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../Helper/Utils.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        var Utils = Helper.Utils;
        class ColorOptions extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var option = String(args[0]);
                if (option === "random_color") {
                    rets[0] = Utils.random() * 0xFFFFFF;
                }
                else {
                    rets[0] = option;
                }
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Helper.Utils.toColor(${this.args.data[0].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_option = String(${this.args.data[0].to_js_final()});
      `;
            }
            to_js_final() {
                return `
        Helper.Utils.toColor(__wl_${this.id}_option)
      `;
            }
        }
        Instructions.ColorOptions = ColorOptions;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../Helper/Utils.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        var Utils = Helper.Utils;
        class ColorRGB extends ASTNode {
            constructor() {
                super(3, 0); // numArgs = 3, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var red = Utils.limit(args[0], 0, 255);
                var green = Utils.limit(args[1], 0, 255);
                var blue = Utils.limit(args[2], 0, 255);
                /* tslint:disable no-bitwise */
                var color = (red << 16) + (green << 8) + blue;
                /* tslint:enable no-bitwise */
                rets[0] = color;
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        ((Helper.Utils.limit(${this.args.data[0].to_js_no_yield()}, 0, 255) << 16)
         + (Helper.Utils.limit(${this.args.data[1].to_js_no_yield()},  0, 255) << 8)
         + (Helper.Utils.limit(${this.args.data[2].to_js_no_yield()},  0, 255) << 0)
        )
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};
        ${this.args.data[2].to_js_setup()};

        var __wl_${this.id}_red = Helper.Utils.limit(${this.args.data[0].to_js_final()}, 0, 255);
        var __wl_${this.id}_green = Helper.Utils.limit(${this.args.data[1].to_js_final()}, 0, 255);
        var __wl_${this.id}_blue = Helper.Utils.limit(${this.args.data[2].to_js_final()}, 0, 255);
      `;
            }
            to_js_final() {
                return `
        (__wl_${this.id}_red << 16) + (__wl_${this.id}_green << 8) + (__wl_${this.id}_blue)
      `;
            }
        }
        Instructions.ColorRGB = ColorRGB;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class CompAnd extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                rets[0] = args[0] && args[1];
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        (${this.args.data[0].to_js_no_yield()} && ${this.args.data[1].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                // Short circuit evaluation of the second parameter if the first is false
                return `
        ${this.args.data[0].to_js_setup()};
        var __wl_${this.id}_a = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_b;


        if (__wl_${this.id}_a) {
          ${this.args.data[1].to_js_setup()};
          __wl_${this.id}_b = ${this.args.data[1].to_js_final()};
        }
      `;
            }
            to_js_final() {
                return `
        __wl_${this.id}_a && __wl_${this.id}_b
      `;
            }
        }
        Instructions.CompAnd = CompAnd;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Comparison.ts" />
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        var Comparison = Helper.Comparison;
        class CompEquals extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                rets[0] = Comparison.equals(args[0], args[1]);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
         Helper.Comparison.equals(${this.args.data[0].to_js_no_yield()}, ${this.args.data[1].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        var __wl_${this.id}_a = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_b = ${this.args.data[1].to_js_final()};
      `;
            }
            to_js_final() {
                return `
         Helper.Comparison.equals(__wl_${this.id}_a, __wl_${this.id}_b);
      `;
            }
        }
        Instructions.CompEquals = CompEquals;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Comparison.ts" />
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        var Comparison = Helper.Comparison;
        class CompNotEquals extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                rets[0] = !Comparison.equals(args[0], args[1]);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
         !Helper.Comparison.equals(${this.args.data[0].to_js_no_yield()}, ${this.args.data[1].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        var __wl_${this.id}_a = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_b = ${this.args.data[1].to_js_final()};
      `;
            }
            to_js_final() {
                return `
         !Helper.Comparison.equals(__wl_${this.id}_a, __wl_${this.id}_b);
      `;
            }
        }
        Instructions.CompNotEquals = CompNotEquals;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Comparison.ts" />
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Comparison = Helper.Comparison;
        var Constants = Helper.Constants;
        class CompGreaterThan extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var c1 = args[0];
                var c2 = args[1];
                rets[0] = Comparison.gt(c1, c2);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Helper.Comparison.gt(${this.args.data[0].to_js_no_yield()}, ${this.args.data[1].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        var __wl_${this.id}_a = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_b = ${this.args.data[1].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        Helper.Comparison.gt(__wl_${this.id}_a, __wl_${this.id}_b)
      `;
            }
        }
        Instructions.CompGreaterThan = CompGreaterThan;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Comparison.ts" />
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Comparison = Helper.Comparison;
        var Constants = Helper.Constants;
        class CompGreaterThanOrEqualTo extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var c1 = args[0];
                var c2 = args[1];
                rets[0] = Comparison.gte(c1, c2);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Helper.Comparison.gte(${this.args.data[0].to_js_no_yield()}, ${this.args.data[1].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        var __wl_${this.id}_a = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_b = ${this.args.data[1].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        Helper.Comparison.gte(__wl_${this.id}_a, __wl_${this.id}_b)
      `;
            }
        }
        Instructions.CompGreaterThanOrEqualTo = CompGreaterThanOrEqualTo;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Comparison.ts" />
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        var Comparison = Helper.Comparison;
        class CompLessThan extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var c1 = args[0];
                var c2 = args[1];
                rets[0] = Comparison.lt(c1, c2);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Helper.Comparison.lt(${this.args.data[0].to_js_no_yield()}, ${this.args.data[1].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        var __wl_${this.id}_a = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_b = ${this.args.data[1].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        Helper.Comparison.lt(__wl_${this.id}_a, __wl_${this.id}_b)
      `;
            }
        }
        Instructions.CompLessThan = CompLessThan;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../Helper/Comparison.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../Helper/Comparison.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Comparison = Helper.Comparison;
        var Constants = Helper.Constants;
        class CompLessThanOrEqualTo extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var c1 = args[0];
                var c2 = args[1];
                rets[0] = Comparison.lte(c1, c2);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Helper.Comparison.lte(${this.args.data[0].to_js_no_yield()}, ${this.args.data[1].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        var __wl_${this.id}_a = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_b = ${this.args.data[1].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        Helper.Comparison.lte(__wl_${this.id}_a, __wl_${this.id}_b)
      `;
            }
        }
        Instructions.CompLessThanOrEqualTo = CompLessThanOrEqualTo;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class CompNot extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                rets[0] = Boolean(!args[0]);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        !Boolean(${this.args.data[0].to_js_final()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_b = Boolean(${this.args.data[0].to_js_final()});
      `;
            }
            to_js_final() {
                return `
        !__wl_${this.id}_b
      `;
            }
        }
        Instructions.CompNot = CompNot;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class CompOr extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                rets[0] = args[0] || args[1];
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        (${this.args.data[0].to_js_no_yield()} || ${this.args.data[1].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                // Short circuit evaluation of the second parameter if the first is true
                return `
        ${this.args.data[0].to_js_setup()};
        var __wl_${this.id}_a = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_b;


        if (!__wl_${this.id}_a) {
          ${this.args.data[1].to_js_setup()};
          __wl_${this.id}_b = ${this.args.data[1].to_js_final()};
        }
      `;
            }
            to_js_final() {
                return `
        __wl_${this.id}_a || __wl_${this.id}_b
      `;
            }
        }
        Instructions.CompOr = CompOr;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class ConstantTrue extends ASTNode {
            constructor() {
                super(0, 0); // numArgs = 0, numBranches = 0
            }
            fn(a, scope, args, rets) {
                rets[0] = true;
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        true
      `;
            }
            to_js_setup() {
                return ``;
            }
            to_js_final() {
                return `
        true
      `;
            }
        }
        Instructions.ConstantTrue = ConstantTrue;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class ConstantFalse extends ASTNode {
            constructor() {
                super(0, 0); // numArgs = 0, numBranches = 0
            }
            fn(a, scope, args, rets) {
                rets[0] = false;
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        false
      `;
            }
            to_js_setup() {
                return ``;
            }
            to_js_final() {
                return `
        false
      `;
            }
        }
        Instructions.ConstantFalse = ConstantFalse;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class ConstantPi extends ASTNode {
            constructor() {
                super(0, 0); // numArgs = 0, numBranches = 0
            }
            fn(_, scope, args, rets) {
                rets[0] = Math.PI;
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Math.PI
      `;
            }
            to_js_setup() {
                return ``;
            }
            to_js_final() {
                return `
        Math.PI
      `;
            }
        }
        Instructions.ConstantPi = ConstantPi;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../dts/viewport.d.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class CameraTake extends ASTNode {
            constructor() {
                super(0, 0); // numArgs = 0, numBranches = 0
            }
            fn(a, scope, args, rets) {
                rets[0] = undefined;
                rets[1] = Constants.AST_DONE;
                viewport.setCameraAgent(a.state, a.prevState);
            }
            to_js_no_yield() {
                return `
        __wl_agt.hasCamera = true;
        viewport.setCameraAgent(__wl_agt.state, __wl_agt.prevState);
      `;
            }
            to_js_setup() {
                return `
      `;
            }
            to_js_final() {
                return `
        __wl_agt.hasCamera = true;
        viewport.setCameraAgent(__wl_agt.state, __wl_agt.prevState);
      `;
            }
        }
        Instructions.CameraTake = CameraTake;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../Common/Agent.ts" />
/// <reference path="../Helper/Logger.ts" />
var DataStructures;
(function (DataStructures) {
    "use strict";
    var Logger = Helper.Logger;
    class CollisionPair {
        constructor(agentA, agentB) {
            this.a = agentA;
            this.b = agentB;
            DataStructures.CollisionPair.existingPairs.get(this.a.id).set(this.b.id, this);
        }
        static findOrCreate(agentA, agentB) {
            var a, b;
            try {
                if (agentA === agentB) {
                    throw new Error;
                }
            }
            catch (e) {
                Logger.error("Agent cannot collide with itself: ");
                Logger.error(e.stack);
            }
            if (agentA.id < agentB.id) {
                a = agentA;
                b = agentB;
            }
            else if (agentB.id < agentA.id) {
                a = agentB;
                b = agentA;
            }
            // check to see if this pair has already been created.
            // if so, return that existing object rather than
            // creating a new one.
            // if no, create the new one and save it before returning.
            if (!DataStructures.CollisionPair.existingPairs.has(a.id)) {
                DataStructures.CollisionPair.existingPairs.set(a.id, new Map());
            }
            var candidatePairs = DataStructures.CollisionPair.existingPairs.get(a.id);
            if (candidatePairs.has(b.id)) {
                return candidatePairs.get(b.id);
            }
            else {
                return new DataStructures.CollisionPair(a, b);
            }
        }
        /**
         * returns true if the two pairs have the same elements
         */
        static equals(cp1, cp2) {
            return ((cp1.a === cp2.a) && (cp1.b === cp2.b));
        }
    }
    CollisionPair.existingPairs = new Map();
    DataStructures.CollisionPair = CollisionPair;
})(DataStructures || (DataStructures = {}));
/// <reference path="../Common/Agent.ts" />
/// <reference path="../Common/Breed.ts" />
/// <reference path="../Common/State.ts" />
/// <reference path="../Execution/AgentController.ts" />
/// <reference path="../DataStructures/CollisionPair.ts" />
/// <reference path="../Helper/Constants.ts" />
/// <reference path="../Helper/Logger.ts" />
/// <reference path="../Helper/Comparison.ts" />
var Execution;
(function (Execution) {
    "use strict";
    var State = Common.State;
    var Constants = Helper.Constants;
    var Comparison = Helper.Comparison;
    var AgentController = Execution.AgentController;
    var CollisionPair = DataStructures.CollisionPair;
    class Collisions {
        constructor() {
            throw new Error("Static class cannot be instantiated");
        }
        static add(a) {
            /* tslint:disable no-var-keyword */
            var radius = a.state.size * .5;
            var minX = Math.max(0, Math.floor((a.state.x - radius + Constants.MAPSIZE) / Execution.Collisions.binSize));
            var maxX = Math.min(9, Math.floor((a.state.x + radius + Constants.MAPSIZE) / Execution.Collisions.binSize));
            var minY = Math.max(0, Math.floor((a.state.y - radius + Constants.MAPSIZE) / Execution.Collisions.binSize));
            var maxY = Math.min(9, Math.floor((a.state.y + radius + Constants.MAPSIZE) / Execution.Collisions.binSize));
            for (var x = minX; x <= maxX; x++) {
                for (var y = minY; y <= maxY; y++) {
                    Execution.Collisions.bins.get(a.breed.id)[x][y].push(a);
                    a.jbins.push([x, y]);
                }
            }
            /* tslint:enable no-var-keyword */
        }
        static remove(a) {
            /* tslint:disable no-var-keyword */
            for (var i = 0; i < a.jbins.length; i++) {
                var x = a.jbins[i][0];
                var y = a.jbins[i][1];
                var bin = Execution.Collisions.bins.get(a.breed.id)[x][y];
                bin.splice(bin.indexOf(a), 1);
            }
            a.jbins = [];
            /* tslint:enable no-var-keyword */
        }
        static update(a) {
            Execution.Collisions.remove(a);
            Execution.Collisions.add(a);
        }
        static getCollisions() {
            /* tslint:disable no-var-keyword */
            var collisions = [];
            for (var i = 1; i < AgentController.numAgents; i++) {
                var a = AgentController.data[i];
                if (a === undefined || !State.collidingBreeds.has(a.breed.id) || a.isDead) {
                    continue;
                }
                for (var j = 0; j < a.jbins.length; j++) {
                    var x = a.jbins[j][0];
                    var y = a.jbins[j][1];
                    var collidedBreeds = State.collidedBreeds.get(a.breed.id);
                    for (var k = 0; k < collidedBreeds.length; k++) {
                        var otherBreed = collidedBreeds[k];
                        var bin = Execution.Collisions.bins.get(otherBreed)[x][y];
                        for (var l = 0; l < bin.length; l++) {
                            var b = bin[l];
                            if (a === b || (a.breed === b.breed && a.id > b.id)) {
                                continue;
                            }
                            var rSq = (a.state.size + b.state.size) * (a.state.size + b.state.size) / 4;
                            var dx = (a.state.x - b.state.x);
                            var dy = (a.state.y - b.state.y);
                            var dz = (a.state.z - b.state.z);
                            if ((dx * dx + dy * dy + dz * dz) < rSq) {
                                collisions.push(CollisionPair.findOrCreate(a, b));
                            }
                        }
                    }
                }
            }
            return collisions;
            /* tslint:enable no-var-keyword */
        }
        static count(a, breedName, radius, trait, val) {
            /* tslint:disable no-var-keyword */
            var breedID = AgentController.getByName(breedName).id;
            var maxSize = 2 * Math.sqrt(2) * Constants.MAPSIZE;
            if (radius > maxSize) {
                if (breedID === AgentController.EVERYONE.id) {
                    return AgentController.numAgents;
                }
                var count = 0;
                for (var i = 1; i < AgentController.numAgents; i++) {
                    var agent = AgentController.data[i];
                    if (agent.breed.id == breedID && (!trait || Comparison.equals(agent.getTrait(trait), val))) {
                        count++;
                    }
                }
                return count;
            }
            if (breedID === AgentController.EVERYONE.id) {
                return Execution.Collisions.countEveryone(a, radius, trait, val);
            }
            var minX = Math.max(0, ~~((a.state.x - radius + Constants.MAPSIZE) / Execution.Collisions.binSize));
            var maxX = Math.min(9, ~~((a.state.x + radius + Constants.MAPSIZE) / Execution.Collisions.binSize));
            var minY = Math.max(0, ~~((a.state.y - radius + Constants.MAPSIZE) / Execution.Collisions.binSize));
            var maxY = Math.min(9, ~~((a.state.y + radius + Constants.MAPSIZE) / Execution.Collisions.binSize));
            var radiusSq = radius * radius;
            var results = new Set();
            var bins = Execution.Collisions.bins.get(breedID);
            if (minX === maxX && minY === maxY) {
                var bin = bins[minX][minY];
                for (var i = 0; i < bin.length; i++) {
                    var b = bin[i];
                    if (!b.isDead && !results.has(b.id) && (!trait || Comparison.equals(b.getTrait(trait), val))) {
                        if (Execution.Collisions.distSq(a, b) <= radiusSq) {
                            results.add(b.id);
                        }
                    }
                }
                results.delete(a.id);
                return results.size;
            }
            for (var x = minX; x <= maxX; x++) {
                for (var y = minY; y <= maxY; y++) {
                    var bin = bins[x][y];
                    for (var i = 0; i < bin.length; i++) {
                        var b = bin[i];
                        if (!b.isDead && !results.has(b.id) && (!trait || Comparison.equals(b.getTrait(trait), val))) {
                            if (Execution.Collisions.distSq(a, b) <= radiusSq) {
                                results.add(b.id);
                            }
                        }
                    }
                }
            }
            results.delete(a.id);
            return results.size;
            /* tslint:enable no-var-keyword */
        }
        static countEveryone(a, radius, trait, val) {
            /* tslint:disable no-var-keyword */
            var breedIDs = AgentController.getBreedIDs();
            var results = new Set();
            var minX = Math.max(0, Math.floor((a.state.x - radius + Constants.MAPSIZE) / Execution.Collisions.binSize));
            var maxX = Math.min(9, Math.floor((a.state.x + radius + Constants.MAPSIZE) / Execution.Collisions.binSize));
            var minY = Math.max(0, Math.floor((a.state.y - radius + Constants.MAPSIZE) / Execution.Collisions.binSize));
            var maxY = Math.min(9, Math.floor((a.state.y + radius + Constants.MAPSIZE) / Execution.Collisions.binSize));
            for (var i = 0; i < breedIDs.length; i++) {
                var bid = breedIDs[i];
                for (var x = minX; x <= maxX; x++) {
                    for (var y = minY; y <= maxY; y++) {
                        var bin = Execution.Collisions.bins.get(bid)[x][y];
                        for (var i = 0; i < bin.length; i++) {
                            var b = bin[i];
                            if (!results.has(b.id) && !b.isDead && (!trait || Comparison.equals(b.getTrait(trait), val))) {
                                if (Execution.Collisions.distSq(a, b) <= radius * radius) {
                                    results.add(b.id);
                                }
                            }
                        }
                    }
                }
            }
            results.delete(a.id);
            return results.size;
            /* tslint:enable no-var-keyword */
        }
        static nearest(a, breedName, radius, trait, val) {
            var breedID = AgentController.getByName(breedName).id;
            // search in concentric squares centered at a for nearest agent
            var nLevels = Math.ceil(radius / Execution.Collisions.binSize);
            var centerX = Math.round((a.state.x + Constants.MAPSIZE) / Execution.Collisions.binSize);
            var centerY = Math.round((a.state.y + Constants.MAPSIZE) / Execution.Collisions.binSize);
            var breedIDs;
            if (breedID === AgentController.EVERYONE.id) {
                breedIDs = AgentController.getBreedIDs();
            }
            else {
                breedIDs = [breedID];
            }
            var bestAgent = undefined;
            var bestDistSq = Infinity;
            for (var i = 0; i < nLevels; i++) {
                for (var j = 0; j < breedIDs.length; j++) {
                    var bid = breedIDs[j];
                    for (var x = Math.max(0, centerX - i); x <= Math.min(9, centerX + i); x++) {
                        for (var y = Math.max(0, centerY - i); y <= Math.min(9, centerY + i); y++) {
                            var bin = Execution.Collisions.bins.get(bid)[x][y];
                            for (var j = 0; j < bin.length; j++) {
                                var b = bin[j];
                                if (a !== b && bestAgent !== b && !b.isDead && (!trait || Comparison.equals(b.getTrait(trait), val))) {
                                    var distSq = Execution.Collisions.distSq(a, b);
                                    if (distSq < bestDistSq) {
                                        bestAgent = b;
                                        bestDistSq = distSq;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if (bestAgent !== undefined) {
                return bestAgent;
            }
            return a;
        }
        static empty(breedID) {
            var bins = Execution.Collisions.bins.get(breedID);
            for (var i = 0; i < Execution.Collisions.binSize; i++) {
                for (var j = 0; j < Execution.Collisions.binSize; j++) {
                    if (bins[i][j].length > 0) {
                        return false;
                    }
                }
            }
            return true;
        }
        static reset() {
            for (var bid of AgentController.getBreedIDs()) {
                var bins = Execution.Collisions.bins.get(bid);
                for (var i = 0; i < Execution.Collisions.binSize; i++) {
                    for (var j = 0; j < Execution.Collisions.binSize; j++) {
                        if (bins[i][j].length > 0) {
                            bins[i][j] = [];
                        }
                    }
                }
            }
        }
        static distSq(a, b) {
            var dx = a.state.x - b.state.x;
            var dy = a.state.y - b.state.y;
            var dz = a.state.z - b.state.z;
            return dx * dx + dy * dy + dz * dz;
        }
    }
    Collisions.bins = new Map();
    Collisions.binSize = 10;
    Execution.Collisions = Collisions;
})(Execution || (Execution = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../Execution/Collisions.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        var Collisions = Execution.Collisions;
        class Count extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var nearBreed = String(args[0]);
                var radius = Number(args[1]);
                rets[0] = Collisions.count(a, nearBreed, radius);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Execution.Collisions.count(__wl_agt, ${this.args.data[0].to_js_no_yield()},
                                              ${this.args.data[1].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        var __wl_${this.id}_breed = String(${this.args.data[0].to_js_final()});
        var __wl_${this.id}_radius = String(${this.args.data[1].to_js_final()});
      `;
            }
            to_js_final() {
                return `
        Execution.Collisions.count(__wl_wgt, __wl_${this.id}_breed, __wl_${this.id}_radius)
      `;
            }
        }
        Instructions.Count = Count;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../Common/Trait.ts" />
/// <reference path="../../Helper/Logger.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Logger = Helper.Logger;
        class UtilTraitHelper extends ASTNode {
            traitHelper(a, trait) {
                switch (trait) {
                    case "x":
                        return a.state.x;
                    case "y":
                        return a.state.y;
                    case "z":
                        return a.state.z;
                    case "color":
                        return a.state.color;
                    case "shape":
                        return a.state.shape;
                    case "heading":
                        return a.state.heading;
                    case "size":
                        return a.state.size;
                    case "breed":
                        return a.breed;
                    case "id":
                        return a.id;
                    default:
                        return this.customTraitHelper(a, trait);
                }
            }
            customTraitHelper(a, trait) {
                var traitID = a.breed.getTraitID(trait);
                var value = a.traits[traitID];
                if (!isNaN(Number(value))) {
                    return Number(value);
                }
                return value;
            }
            traitSetHelper(a, trait, value) {
                switch (trait) {
                    case "x":
                        a.safeSetX(Number(value));
                        return;
                    case "y":
                        a.safeSetY(Number(value));
                        return;
                    case "z":
                        a.safeSetZ(Number(value));
                        return;
                    case "color":
                        a.safeSetColor(Number(value));
                        return;
                    case "shape":
                        a.safeSetShape(String(value));
                        return;
                    case "heading":
                        a.safeSetHeading(Number(value));
                        return;
                    case "size":
                        a.safeSetSize(Number(value));
                        return;
                    default:
                        this.customTraitSetHelper(a, trait, value);
                        return;
                }
            }
            customTraitSetHelper(a, trait, value) {
                var traitID = a.breed.getTraitID(trait);
                var check = a.traits[traitID];
                // if the trait exists, set it.
                if (check !== undefined) {
                    a.setTrait(trait, value);
                }
                else {
                    Logger.error(`Trying to set trait <${trait}> of breed <${a.breed}>, but trait doesn't exist!`);
                    a.setTrait(trait, value);
                }
            }
        }
        Instructions.UtilTraitHelper = UtilTraitHelper;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../Execution/Collisions.ts" />
/// <reference path="UtilTraitHelper.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var Constants = Helper.Constants;
        var Collisions = Execution.Collisions;
        class CountWith extends Instructions.UtilTraitHelper {
            constructor() {
                super(4, 0); // numArgs = 4, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var nearBreed = String(args[0]);
                var radius = Number(args[1]);
                var trait = String(args[2]);
                var withData = args[3];
                rets[0] = Collisions.count(a, nearBreed, radius, trait, withData);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Execution.Collisions.count(__wl_agt,
                                   ${this.args.data[0].to_js_no_yield()},
                                   ${this.args.data[1].to_js_no_yield()},
                                   ${this.args.data[2].to_js_no_yield()},
                                   ${this.args.data[3].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};
        ${this.args.data[2].to_js_setup()};
        ${this.args.data[3].to_js_setup()};

        var __wl_${this.id}_breed = String(${this.args.data[0].to_js_final()});
        var __wl_${this.id}_radius = String(${this.args.data[1].to_js_final()});
        var __wl_${this.id}_trait = String(${this.args.data[2].to_js_final()});
        var __wl_${this.id}_with_data = String(${this.args.data[3].to_js_final()});
      `;
            }
            to_js_final() {
                return `
        Execution.Collisions.count(__wl_wgt, __wl_${this.id}_breed, __wl_${this.id}_radius,
                                   __wl_${this.id}_trait, __wl_${this.id}_with_data)
      `;
            }
        }
        Instructions.CountWith = CountWith;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../Common/State.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        class DetectCollision extends ASTNode {
            constructor() {
                super(1, 1); // numArgs = 1, numBranches = 1
            }
            fn(a, scope, args, rets) {
                rets[0] = 0;
                rets[1] = 0; // take the first branch
            }
            to_js_no_yield() {
                return `
        ${this.branches[0].to_js()}
      `;
            }
            to_js_setup() {
                return ``;
            }
            to_js_final() {
                return `
        ${this.branches[0].to_js()}
      `;
            }
        }
        Instructions.DetectCollision = DetectCollision;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../Execution/Collisions.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        var Collisions = Execution.Collisions;
        class DetectNearest extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var nearBreed = String(args[0]);
                var radius = Number(args[1]);
                rets[0] = Collisions.nearest(a, nearBreed, radius);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Execution.Collisions.nearest(__wl_agt, ${this.args.data[0].to_js_no_yield()},
                                                ${this.args.data[1].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        var __wl_${this.id}_breed = String(${this.args.data[0].to_js_final()});
        var __wl_${this.id}_radius = String(${this.args.data[1].to_js_final()});
      `;
            }
            to_js_final() {
                return `
        Execution.Collisions.nearest(__wl_agt, __wl_${this.id}_breed, __wl_${this.id}_radius);
      `;
            }
        }
        Instructions.DetectNearest = DetectNearest;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../Execution/Collisions.ts" />
/// <reference path="UtilTraitHelper.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var Constants = Helper.Constants;
        var Collisions = Execution.Collisions;
        class DetectNearestWith extends Instructions.UtilTraitHelper {
            constructor() {
                super(4, 0); // numArgs = 4, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var nearBreed = String(args[0]);
                var radius = Number(args[1]);
                var trait = String(args[2]);
                var withData = args[3];
                rets[0] = Collisions.nearest(a, nearBreed, radius, trait, withData);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Execution.Collisions.nearest(__wl_agt,
                                     ${this.args.data[0].to_js_no_yield()},
                                     ${this.args.data[1].to_js_no_yield()},
                                     ${this.args.data[2].to_js_no_yield()},
                                     ${this.args.data[3].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};
        ${this.args.data[2].to_js_setup()};
        ${this.args.data[3].to_js_setup()};

        var __wl_${this.id}_breed = String(${this.args.data[0].to_js_final()});
        var __wl_${this.id}_radius = String(${this.args.data[1].to_js_final()});
        var __wl_${this.id}_trait = String(${this.args.data[2].to_js_final()});
        var __wl_${this.id}_with_data = String(${this.args.data[3].to_js_final()});
      `;
            }
            to_js_final() {
                return `
        Execution.Collisions.nearest(__wl_agt, __wl_${this.id}_breed, __wl_${this.id}_radius,
                                     __wl_${this.id}_trait, __wl_${this.id}_with_data)
      `;
            }
        }
        Instructions.DetectNearestWith = DetectNearestWith;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class FaceTowards extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var receivedAgent = args[0];
                var pX = receivedAgent.state.x;
                var pY = receivedAgent.state.y;
                if (!(pX === a.state.x && pY === a.state.y)) {
                    a.safeSetHeading(Math.atan2(pY - a.state.y, pX - a.state.x) * 180 / Math.PI);
                }
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        __wl_agt.faceTowards(${this.args.data[0].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_agt = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        __wl_agt.faceTowards(__wl_${this.id}_agt);
      `;
            }
        }
        Instructions.FaceTowards = FaceTowards;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Helper/Constants.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class GetMyTrait extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var trait = String(args[0]);
                rets[0] = a.getTrait(trait);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        __wl_agt.getTrait(${this.args.data[0].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_trait = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        __wl_agt.getTrait(__wl_${this.id}_trait);
      `;
            }
        }
        Instructions.GetMyTrait = GetMyTrait;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class If extends ASTNode {
            constructor() {
                super(1, 1); // numArgs = 1, numBranches = 1
            }
            fn(a, scope, args, rets) {
                if (args[0]) {
                    rets[1] = 0;
                }
                else {
                    rets[1] = Constants.AST_DONE;
                }
            }
            to_js_no_yield() {
                return `
        if (${this.args.data[0].to_js_no_yield()}) {
          ${this.branches[0].to_js()}
        }
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_cond = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        if (__wl_${this.id}_cond) {
          ${this.branches[0].to_js()}
        }
      `;
            }
        }
        Instructions.If = If;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        class IfElse extends ASTNode {
            constructor() {
                super(1, 2); // numArgs = 1, numBranches = 2
            }
            fn(a, scope, args, rets) {
                if (args[0]) {
                    rets[1] = 0;
                }
                else {
                    rets[1] = 1;
                }
            }
            to_js_no_yield() {
                return `
        if (${this.args.data[0].to_js_no_yield()}) {
          ${this.branches[0].to_js()}
        } else {
          ${this.branches[1].to_js()}
        }
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_cond = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        if (__wl_${this.id}_cond) {
          ${this.branches[0].to_js()}
        } else {
          ${this.branches[1].to_js()}
        }
      `;
            }
        }
        Instructions.IfElse = IfElse;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
var Helper;
(function (Helper) {
    "use strict";
    class KeyManager {
        static init() {
            document.getElementById("renderer-canvas").addEventListener("keydown", this.keydownCB);
            document.getElementById("renderer-canvas").addEventListener("keyup", this.keyupCB);
            Helper.KeyManager.reset();
        }
        // Is the current key of this epoch equal to this key?
        static isKeyPressed(key) {
            // In javascript land, the 0th element of an empty array is undefined
            return Helper.KeyManager.pressedQueue[0] === key;
        }
        // Is the key currently held down
        static isKeyHeld(key) {
            return Helper.KeyManager.pressedKeys.has(key);
        }
        static reset() {
            Helper.KeyManager.pressedQueue = new Array();
            Helper.KeyManager.pressedKeys = new Set();
        }
        static keypressCB(e) {
            // pass
        }
        static keydownCB(e) {
            var key = e.keyCode;
            if (!Helper.KeyManager.pressedKeys.has(key)) {
                Helper.KeyManager.pressedQueue.push(key);
            }
            Helper.KeyManager.pressedKeys.add(key);
            if (!e.metaKey) {
                e.preventDefault();
            }
            else {
                // if this keystroke causes a default browser action (like search, bookmark, etc),
                // we won't receive the keyup event so we manually clear the pressedKeys
                if (key !== 17 && key !== 18 && key !== 91 && key !== 93 && key !== 224) {
                    setTimeout(function () { KeyManager.pressedKeys.clear(); }, 100);
                }
            }
        }
        static keyupCB(e) {
            var key = e.keyCode;
            Helper.KeyManager.pressedKeys.delete(key);
            if (!e.metaKey) {
                e.preventDefault();
            }
        }
        static tick() {
            Helper.KeyManager.pressedQueue.shift();
        }
    }
    // this is a queue of pressed keys: keydowns get sent here and they get
    // processed each time tick is called
    KeyManager.pressedQueue = new Array();
    // this is a set of keys that are currently pressed
    KeyManager.pressedKeys = new Set();
    Helper.KeyManager = KeyManager;
})(Helper || (Helper = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../Helper/KeyManager.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        var KeyManager = Helper.KeyManager;
        class KeyHeld extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var key = Number(args[0]);
                rets[0] = KeyManager.isKeyHeld(key);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Helper.KeyManager.isKeyHeld(Number(${this.args.data[0].to_js_no_yield()}))
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_key = Number(${this.args.data[0].to_js_final()});
      `;
            }
            to_js_final() {
                return `
        Helper.KeyManager.isKeyHeld(__wl_${this.id}_key)
      `;
            }
        }
        Instructions.KeyHeld = KeyHeld;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../Helper/KeyManager.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        var KeyManager = Helper.KeyManager;
        class KeyTyped extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var key = Number(args[0]);
                rets[0] = KeyManager.isKeyPressed(key);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Helper.KeyManager.isKeyPressed(Number(${this.args.data[0].to_js_no_yield()}))
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_key = Number(${this.args.data[0].to_js_final()});
      `;
            }
            to_js_final() {
                return `
        Helper.KeyManager.isKeyPressed(__wl_${this.id}_key)
      `;
            }
        }
        Instructions.KeyTyped = KeyTyped;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class List extends ASTNode {
            constructor(numElements) {
                super(numElements, 0); // numArgs = numElements, numBranches = 0
            }
            fn(a, scope, args, rets) {
                // create a shallow copy
                rets[0] = args.slice(0);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        ${this.args.data[0].to_js_no_yield()}.slice(0)
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_list = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        __wl_${this.id}_list.slice(0);
      `;
            }
        }
        Instructions.List = List;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../Helper/Comparison.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        var Comparison = Helper.Comparison;
        class ListContains extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var list = Array(args[0]);
                var item = args[1];
                if (list.indexOf(item) !== -1) {
                    rets[0] = true;
                }
                else {
                    rets[0] = false;
                    for (var datum of list) {
                        if (Comparison.equals(datum, item)) {
                            rets[0] = true;
                            break;
                        }
                    }
                }
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Helper.Utils.listContains(${this.args.data[0].to_js_no_yield()}, ${this.args.data[1].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        __wl_${this.id}_list = ${this.args.data[0].to_js_final()};
        __wl_${this.id}_item = ${this.args.data[1].to_js_final()};

        __wl_${this.id}_ret;
        if (__wl_${this.id}_list.indexOf(__wl_${this.id}_item) !== -1) {
          __wl_${this.id}_ret = true;
        } else {
          __wl_${this.id}_ret = false;
          for (var datum of __wl_${this.id}_list) {
            if (Helper.Comparison.equals(datum, __wl_${this.id}_item)) {
              __wl_${this.id}_ret = true;
              break;
            }
          }
        }
      `;
            }
            to_js_final() {
                return `
        Helper.Utils.listContains(__wl_${this.id}_list, __wl_${this.id}_item)
      `;
            }
        }
        Instructions.ListContains = ListContains;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class ListGet extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var list = Array(args[0]);
                var index = Number(args[1]);
                rets[0] = list[index];
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        ${this.args.data[0].to_js_no_yield()}[${this.args.data[1].to_js_no_yield()}]
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        var __wl_${this.id}_list = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_idx = ${this.args.data[1].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        __wl_${this.id}_list[__wl_${this.id}_idx]
      `;
            }
        }
        Instructions.ListGet = ListGet;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class ListSplice extends ASTNode {
            constructor(mode) {
                super(3, 0); // numArgs = 3, numBranches = 0
                this.mode = mode || Constants.LIST_BEGINNING; // LIST_BEGINNING happens to be 0
            }
            fn(a, scope, args, rets) {
                var index = Number(args[0]);
                var toInsert = Array(args[1]);
                var listInto = Array(args[2]);
                if (this.mode === Constants.LIST_BEGINNING) {
                    rets[0] = toInsert.concat(listInto);
                }
                else if (this.mode === Constants.LIST_END) {
                    rets[0] = listInto.concat(toInsert);
                }
                else {
                    var firstPartInto = listInto;
                    var lastPartInto = firstPartInto.splice(index);
                    var newList = firstPartInto.concat(toInsert);
                    newList = newList.concat(lastPartInto);
                    rets[0] = newList;
                }
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Helper.Utils.listSplice(${this.args.data[0].to_js_no_yield()},
                                ${this.args.data[1].to_js_no_yield()},
                                ${this.args.data[2].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};
        ${this.args.data[2].to_js_setup()};

        var __wl_${this.id}_idx = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_to_insert = ${this.args.data[1].to_js_final()};
        var __wl_${this.id}_list_into = ${this.args.data[2].to_js_final()};

        var __wl_${this.id}_ret;

        if (${this.mode} === ${Constants.LIST_BEGINNING}) {
          __wl_${this.id}_ret = __wl_${this.id}_to_insert.concat(__wl_${this.id}_list_into);
        } else if (${this.mode} === ${Constants.LIST_END}) {
          __wl_${this.id}_ret = __wl_${this.id}_list_into.concat(__wl_${this.id}_to_insert);
        } else {
          var __wl_${this.id}_first_part_into = __wl_${this.id}_list_into;
          var __wl_${this.id}_last_part_into = __wl_${this.id}_first_part_into.splice(__wl_${this.id}_idx);
          var __wl_${this.id}_new_list = __wl_${this.id}_first_part_into.concat(__wl_${this.id}_to_insert);
          __wl_${this.id}_ret = __wl_${this.id}_new_list.concat(__wl_${this.id}_last_part_into);
        }
      `;
            }
            to_js_final() {
                return `
        __wl_${this.id}_ret
      `;
            }
        }
        Instructions.ListSplice = ListSplice;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../Common/Agent.ts" />
/// <reference path="ListSplice.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var Constants = Helper.Constants;
        var ListSplice = Compilation.Instructions.ListSplice;
        class ListInsert extends ListSplice {
            fn(a, scope, args, rets) {
                var index = args[0];
                var item = args[1];
                var list = Array(args[2]);
                if (this.mode === Constants.LIST_BEGINNING) {
                    list.splice(0, 0, item);
                }
                else if (this.mode === Constants.LIST_END) {
                    list.splice(list.length, 0, item);
                }
                else {
                    list.splice(index, 0, item);
                }
                rets[0] = list;
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Helper.Utils.listInto(${this.args.data[0].to_js_no_yield()},
                              ${this.args.data[1].to_js_no_yield()},
                              ${this.args.data[2].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};
        ${this.args.data[2].to_js_setup()};

        var __wl_${this.id}_idx = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_item = ${this.args.data[1].to_js_final()};
        var __wl_${this.id}_list = ${this.args.data[2].to_js_final()};

        if (${this.mode} === ${Constants.LIST_BEGINNING}) {
          __wl_${this.id}_list.splice(0, 0, __wl_${this.id}_item);
        } else if (${this.mode} === ${Constants.LIST_END}) {
          __wl_${this.id}_list.splice(__wl_${this.id}_list.length, 0, __wl_${this.id}_item);
        } else {
          __wl_${this.id}_list.splice(__wl_${this.id}_idx, 0, __wl_${this.id}_item);
        }
      `;
            }
            to_js_final() {
                return `
        __wl_${this.id}_list
      `;
            }
        }
        Instructions.ListInsert = ListInsert;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class ListLength extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var list = Array(args[0]);
                rets[0] = list.length;
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        ${this.args.data[0].to_js_no_yield()}.length
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        __wl_${this.id}_list = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        __wl_${this.id}_list.length
      `;
            }
        }
        Instructions.ListLength = ListLength;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class LoopRepeat extends ASTNode {
            constructor() {
                super(1, 1); // numArgs = 1, numBranches = 1
            }
            fn(a, scope, args, rets) {
                rets[0] = args[0];
                if (args[0] > 0) {
                    rets[1] = Constants.AST_REPEAT;
                }
                else {
                    rets[1] = Constants.AST_DONE;
                }
            }
            to_js_no_yield() {
                return `
        var __wl_${this.id}_num_iters = ${this.args.data[0].to_js_no_yield()};
        for (var __wl_${this.id}_i = 0; __wl_${this.id}_i < __wl_${this.id}_num_iters; __wl_${this.id}_i++) {
          ${this.branches[0].to_js()};
        }
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_num_iters = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        for (var __wl_loop_i = 0; __wl_loop_i < __wl_${this.id}_num_iters; __wl_loop_i++) {
          ${this.branches[0].to_js()}
        }
      `;
            }
        }
        Instructions.LoopRepeat = LoopRepeat;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class LoopWhile extends ASTNode {
            constructor() {
                super(1, 1); // numArgs = 1, numBranches = 1
            }
            fn(a, scope, args, rets) {
                rets[0] = -1; // signal that we don't want to stop looping after a definite number of times
                if (args[0]) {
                    rets[1] = Constants.AST_REPEAT;
                }
                else {
                    rets[1] = Constants.AST_DONE;
                }
            }
            to_js_no_yield() {
                return `
        while (${this.args.data[0].to_js_no_yield()}) {
          ${this.branches[0].to_js()}
        }
      `;
            }
            to_js_setup() {
                return ``;
            }
            to_js_final() {
                return `
        while (true) {
          ${this.args.data[0].to_js_setup()};
          if (!${this.args.data[0].to_js_final()}) {
            break;
          }

          ${this.branches[0].to_js()}
        }
      `;
            }
        }
        Instructions.LoopWhile = LoopWhile;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class MoveForward extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var amount = Number(args[0]);
                a.moveForward(amount);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        __wl_agt.moveForward(${this.args.data[0].to_js_no_yield()});
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_amount = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        __wl_agt.moveForward(${this.args.data[0].to_js_no_yield()});
      `;
            }
        }
        Instructions.MoveForward = MoveForward;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="MoveForward.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var Constants = Helper.Constants;
        var MoveForward = Compilation.Instructions.MoveForward;
        class MoveBackward extends MoveForward {
            fn(a, scope, args, rets) {
                var amount = Number(args[0]);
                a.moveForward(-amount);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        __wl_agt.moveForward(-${this.args.data[0].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_amount = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        __wl_agt.moveForward(-${this.args.data[0].to_js_no_yield()})
      `;
            }
        }
        Instructions.MoveBackward = MoveBackward;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class MoveDown extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                a.safeSetZ(a.state.z - args[0]);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        __wl_agt.safeSetZ(__wl_agt.state.z - ${this.args.data[0].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_amt = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        __wl_agt.safeSetZ(__wl_agt.state.z - __wl_${this.id}_amt);
      `;
            }
        }
        Instructions.MoveDown = MoveDown;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class MoveLeft extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                a.safeSetHeading(a.state.heading + args[0]);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        __wl_agt.safeSetHeading(__wl_agt.state.heading + ${this.args.data[0].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_amt = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        __wl_agt.safeSetHeading(__wl_agt.state.heading + __wl_${this.id}_amt);
      `;
            }
        }
        Instructions.MoveLeft = MoveLeft;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class MoveRight extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                a.safeSetHeading(a.state.heading - args[0]);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        __wl_agt.safeSetHeading(__wl_agt.state.heading - ${this.args.data[0].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_amt = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        __wl_agt.safeSetHeading(__wl_agt.state.heading - __wl_${this.id}_amt);
      `;
            }
        }
        Instructions.MoveRight = MoveRight;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class MoveTeleport extends ASTNode {
            constructor() {
                super(3, 0); // numArgs = 3, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var x = Number(args[0]);
                var y = Number(args[1]);
                var z = Number(args[2]);
                a.safeSetX(x);
                a.safeSetY(y);
                a.safeSetZ(z);
                a.prevState = a.state.copy();
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        __wl_agt.prevState = __wl_agt.state.copy();
        __wl_agt.safeSetX(${this.args.data[0].to_js_no_yield()});
        __wl_agt.safeSetY(${this.args.data[1].to_js_no_yield()});
        __wl_agt.safeSetZ(${this.args.data[2].to_js_no_yield()});
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};
        ${this.args.data[2].to_js_setup()};

        var __wl_${this.id}_x = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_y = ${this.args.data[1].to_js_final()};
        var __wl_${this.id}_z = ${this.args.data[2].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        __wl_agt.safeSetX(__wl_${this.id}_x);
        __wl_agt.safeSetY(__wl_${this.id}_y);
        __wl_agt.safeSetZ(__wl_${this.id}_z);

        __wl_agt.prevState = __wl_agt.state.copy();
      `;
            }
        }
        Instructions.MoveTeleport = MoveTeleport;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class MoveUp extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                a.safeSetZ(a.state.z + args[0]);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        __wl_agt.safeSetZ(__wl_agt.state.z + ${this.args.data[0].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_amt = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        __wl_agt.safeSetZ(__wl_agt.state.z + __wl_${this.id}_amt);
      `;
            }
        }
        Instructions.MoveUp = MoveUp;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../Helper/Logger.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        var Logger = Helper.Logger;
        class PrintToJSConsole extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                Logger.mustLog(args[0]);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Logger.mustLog(${this.args.data[0].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_print = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        Logger.mustLog(__wl_${this.id}_print);
      `;
            }
        }
        Instructions.PrintToJSConsole = PrintToJSConsole;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../Common/Procedure.ts" />
/// <reference path="../../Common/State.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var State = Common.State;
        var Procedure = Common.Procedure;
        var Constants = Helper.Constants;
        class ProcCall extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            can_yield(procs) {
                // Arg 0 must be a UtilEvalData so we know its value at compile time
                var procName = String(this.args.data[0].getData());
                if (procs.has(procName)) {
                    return false;
                }
                else {
                    procs.add(procName);
                    return State.procedureRoots.get(procName).can_yield(procs);
                }
            }
            fn(a, scope, args, rets) {
                rets[0] = args[0];
                rets[1] = Constants.AST_PROC_CALL;
            }
            to_js_no_yield() {
                var fname = String(this.args.data[0].getData());
                var params = Procedure.getByName(fname).params;
                var args = new Array();
                for (var i = 0; i < params.length; i++) {
                    args.push(",");
                    args.push(`${this.args.data[i + 1].to_js_no_yield()}`);
                }
                return `
        Common.State.procedureFunctions.get("${fname}")(__wl_agt, __wl_thd ${args.join("")})
      `;
            }
            to_js_setup() {
                var setups = [];
                var finals = [];
                for (var i = 0; i < this.args.data.length - 1; i++) {
                    setups[i] = this.args.data[i + 1].to_js_setup();
                    finals[i] = `let __wl_${this.id}_param_val_${i} = ${this.args.data[i + 1].to_js_final()}`;
                }
                var fname = String(this.args.data[0].getData());
                var params = Procedure.getByName(fname).params;
                var args = new Array();
                for (var i = 0; i < params.length; i++) {
                    args.push(",");
                    args.push(`__wl_${this.id}_param_val_${i}`);
                }
                return `
        ${this.args.data[0].to_js_setup()};
        ${setups.join("; ")};
        ${finals.join("; ")};

        var __wl_${this.id}_fn_name = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_fn = Common.State.procedureGenerators.get(__wl_${this.id}_fn_name);

        var __wl_${this.id}_gen = __wl_${this.id}_fn(__wl_agt, __wl_thd ${args.join("")});

        var __wl_${this.id}_ret;
        while (true) {
          var iterRes = __wl_${this.id}_gen.next();
          if (iterRes.done) {
            __wl_${this.id}_ret = iterRes.value;
            break;
          }
          yield "${Constants.YIELD_NORMAL}";
        }
      `;
            }
            to_js_final() {
                return `
        __wl_${this.id}_ret;
      `;
            }
        }
        Instructions.ProcCall = ProcCall;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../Common/Procedure.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Procedure = Common.Procedure;
        var Constants = Helper.Constants;
        class ProcParam extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var paramName = String(args[0]);
                rets[0] = scope.get(paramName);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                var params = Procedure.getByName(this.procName).params;
                var paramName = String(this.args.data[0].getData());
                var index = params.indexOf(paramName);
                return `
        __wl_param_${index}
      `;
            }
            to_js_setup() {
                return `
      `;
            }
            to_js_final() {
                var params = Procedure.getByName(this.procName).params;
                var paramName = String(this.args.data[0].getData());
                var index = params.indexOf(paramName);
                return `
        __wl_param_${index}
      `;
            }
        }
        Instructions.ProcParam = ProcParam;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class ProcReturn extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                rets[0] = args[0];
                rets[1] = Constants.AST_PROC_RET;
            }
            to_js_no_yield() {
                return `
        return ${this.args.data[0].to_js_no_yield().trim()}
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_ret = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        return __wl_${this.id}_ret;
      `;
            }
        }
        Instructions.ProcReturn = ProcReturn;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../Common/Procedure.ts" />
/// <reference path="../../Helper/Utils.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var CProcedure = Common.Procedure;
        class Procedure extends ASTNode {
            constructor() {
                super(2, 1); // numArgs = 2, numBranches = 1
            }
            fn(a, scope, args, rets) {
                rets[1] = 0;
            }
            to_js_no_yield() {
                return `
        ${this.branches[0].to_js()}
        return ${(this.args.data[1] === undefined) ? undefined : this.args.data[1].to_js_no_yield().trim()};
      `;
            }
            to_js_setup() {
                return ``;
            }
            to_js_final() {
                return `
        ${this.branches[0].to_js()}
      `;
            }
            make_function() {
                var procName = String(this.args.data[0].getData());
                var params = CProcedure.getByName(procName).params;
                var paramNames = new Array(2 * params.length);
                for (var i = 0; i < params.length; i++) {
                    paramNames[2 * i] = ",";
                    paramNames[2 * i + 1] = `__wl_param_${i}`;
                }
                var f;
                /* tslint:disable no-eval */
                eval(`f = function(__wl_agt, __wl_thd ${paramNames.join("")}){ ${this.to_js_no_yield()};}`);
                /* tslint:enable no-eval */
                return f;
            }
            make_generator() {
                var procName = String(this.args.data[0].getData());
                var params = CProcedure.getByName(procName).params;
                var paramNames = new Array(2 * params.length);
                for (var i = 0; i < params.length; i++) {
                    paramNames[2 * i] = ",";
                    paramNames[2 * i + 1] = `__wl_param_${i}`;
                }
                var g;
                /* tslint:disable no-eval */
                eval(`g = function*(__wl_agt, __wl_thd ${paramNames.join("")}){
              ${this.to_js_setup()}; ${this.to_js_final()};
           }`);
                /* tslint:enable no-eval */
                return g;
            }
        }
        Instructions.Procedure = Procedure;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../Helper/Utils.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        var Utils = Helper.Utils;
        class RandomDecimal extends ASTNode {
            constructor() {
                super(0, 0); // numArgs = 0, numBranches = 0
            }
            fn(a, scope, args, rets) {
                rets[0] = Utils.random();
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Helper.Utils.random()
      `;
            }
            to_js_setup() {
                return ``;
            }
            to_js_final() {
                return `
        Helper.Utils.random()
      `;
            }
        }
        Instructions.RandomDecimal = RandomDecimal;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../Helper/Utils.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        var Utils = Helper.Utils;
        class RandomInteger extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var lower = Number(args[0]);
                var upper = Number(args[1]);
                rets[0] = Math.floor((Utils.random() * (upper + 1 - lower)) + lower);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Helper.Utils.randomInteger(${this.args.data[0].to_js_no_yield()}, ${this.args.data[1].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        var __wl_${this.id}_lower = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_upper = ${this.args.data[1].to_js_final()};
        var __wl_${this.id}_range = __wl_${this.id}_upper - __wl_${this.id}_lower + 1;
      `;
            }
            to_js_final() {
                return `
        Math.floor((Helper.Utils.random() * __wl_${this.id}_range) + __wl_${this.id}_lower)
      `;
            }
        }
        Instructions.RandomInteger = RandomInteger;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../Helper/Utils.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        var Utils = Helper.Utils;
        class RandomPercent extends ASTNode {
            constructor() {
                super(1, 1); // numArgs = 1, numBranches = 1
            }
            fn(a, scope, args, rets) {
                if (Utils.random() * 100 < args[0]) {
                    rets[0] = 0;
                    rets[1] = 0;
                }
                else {
                    rets[1] = Constants.AST_DONE;
                }
            }
            to_js_no_yield() {
                return `
        if (Helper.Utils.random() * 100 < ${this.args.data[0].to_js_no_yield()}) {
          ${this.branches[0].to_js()}
        }
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_threshold = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        if (Helper.Utils.random() * 100 < __wl_${this.id}_threshold) {
          ${this.branches[0].to_js()}
        }
      `;
            }
        }
        Instructions.RandomPercent = RandomPercent;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class Scatter extends ASTNode {
            constructor() {
                super(0, 0); // numArgs = 0, numBranches = 0
            }
            fn(a, scope, args, rets) {
                a.scatter();
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        __wl_agt.scatter()
      `;
            }
            to_js_setup() {
                return ``;
            }
            to_js_final() {
                return `
        __wl_agt.scatter();
      `;
            }
        }
        Instructions.Scatter = Scatter;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../Execution/AgentController.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        var AgentController = Execution.AgentController;
        class ScatterEveryone extends ASTNode {
            constructor() {
                super(0, 0); // numArgs = 0, numBranches = 0
            }
            fn(_, scope, args, rets) {
                AgentController.scatterAllAgents();
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Execution.AgentController.scatterAllAgents()
      `;
            }
            to_js_setup() {
                return ``;
            }
            to_js_final() {
                return `
        Execution.AgentController.scatterAllAgents()
      `;
            }
        }
        Instructions.ScatterEveryone = ScatterEveryone;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../Helper/Logger.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        var Logger = Helper.Logger;
        class SendDataToBackend extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                Logger.mustLog(args[0]);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        var reporter = new GameReporter();
        reporter.report(${this.args.data[0].to_js_no_yield()}, {});
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_print = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        Logger.mustLog(__wl_${this.id}_print);
      `;
            }
        }
        Instructions.SendDataToBackend = SendDataToBackend;
        class GameReporter {
            constructor() {
                this.uuid = this.getCookie('session_uuid');
            }
            submitData(data) {
                var xhr = new XMLHttpRequest();
                // This part gets unplatform's session uuid if available
                // and creates a json string for the ajax POST. The /appdata/ api
                // is pretty flexible for the params field. Timestamps are generated
                // server-side & don't need to be included.
                var data_string = {};
                // if you want to test with a session id, you can set
                // document.cookie = "session_uuid=test"
                data_string['session_id'] = this.uuid;
                for (var key in data) {
                    data_string[key] = data[key];
                }
                ;
                var qbank = { data: data_string };
                qbank = JSON.stringify(qbank);
                xhr.open('POST', '/api/v1/logging/genericlog', true); // True means async
                xhr.setRequestHeader("x-api-proxy", this.uuid);
                xhr.setRequestHeader("Content-Type", "application/json");
                xhr.send(qbank);
                if (xhr.response != 200) {
                    var xhr = new XMLHttpRequest();
                    var unplatform = JSON.stringify(data_string);
                    xhr.open('POST', '/api/appdata/', true); // True means async
                    xhr.setRequestHeader("Content-Type", "application/json");
                    xhr.send(unplatform);
                }
            }
            ;
            // Generic get cookie function
            getCookie(cname) {
                var name = cname + "=";
                var ca = document.cookie.split(';');
                for (var i = 0; i < ca.length; i++) {
                    var c = ca[i];
                    while (c.charAt(0) == ' ')
                        c = c.substring(1);
                    if (c.indexOf(name) == 0)
                        return c.substring(name.length, c.length);
                }
                console.log('no uuid found');
            }
            ;
            // The report function is used to report stateless data. This means reports should include
            // as much data and relevant metadata as possible. Timestamps are recorded serverside and
            // are used with reports to reconstruct what students did. Example:
            // var reporter = new GameReporter(); reporter.report('click', {button_name : 'start'});
            report(event, params) {
                var data = {
                    // app_name ideally should be get the app's name
                    // via an environment variable but for now it's hard coded
                    "app_name": "slnova",
                    "version": "1.0",
                    // usually the event that triggrs the action, e.g. go_button_clicked
                    // this field has a max length of 32 chars
                    "event_type": event,
                    // params is the place to dump data related to the event. no max length and
                    // can include sub objects. this data is stringified in the submit data function.
                    // ex: params : {level : 2, player_velocity : 30, computer_velocity : 20 }
                    "params": params,
                };
                this.submitData(data);
            }
        }
        Instructions.GameReporter = GameReporter;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class SetMyTrait extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var trait = String(args[0]);
                var value = args[1];
                a.setTrait(trait, value);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        __wl_agt.setTrait(${this.args.data[0].to_js_no_yield()}, ${this.args.data[1].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        var __wl_${this.id}_trait = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_value = ${this.args.data[1].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        __wl_agt.setTrait(__wl_${this.id}_trait, __wl_${this.id}_value);
      `;
            }
        }
        Instructions.SetMyTrait = SetMyTrait;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class SetPen extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var setting = String(args[0]);
                a.isPenDown = (setting === "down");
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        __wl_agt.isPenDown = (${this.args.data[0].to_js_no_yield()} === "down")
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_state = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        __wl_agt.isPenDown = (__wl_${this.id}_state === "down");
      `;
            }
        }
        Instructions.SetPen = SetPen;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class ShapeOptions extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                rets[0] = String(args[0]);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        ${this.args.data[0].to_js_no_yield()}
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_option = String(${this.args.data[0].to_js_final()});
      `;
            }
            to_js_final() {
                return `
        __wl_${this.id}_option;
      `;
            }
        }
        Instructions.ShapeOptions = ShapeOptions;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class SoundOptions extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                rets[0] = String(args[0]);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        ${this.args.data[0].to_js_no_yield()}
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_option = String(${this.args.data[0].to_js_final()});
      `;
            }
            to_js_final() {
                return `
        __wl_${this.id}_option;
      `;
            }
        }
        Instructions.SoundOptions = SoundOptions;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class SoundPlay extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        AssetManager.playSound(${this.args.data[0].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_sound_id = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        AssetManager.playSound(__wl_${this.id}_sound_id);
      `;
            }
        }
        Instructions.SoundPlay = SoundPlay;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class Stamp extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                rets[0] = undefined;
                rets[1] = Constants.AST_DONE;
                throw new Error("unimplemented");
            }
            to_js_no_yield() {
                return `
        var color = ${this.args.data[0].to_js_no_yield()};
        viewport.terrain.circlePixels(__wl_agt.state.x, __wl_agt.state.y, __wl_agt.state.size,
                                      (color & 0xFF0000) >> 16,
                                      (color & 0x00FF00) >> 8,
                                      color & 0x0000FF)
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        var __wl_${this.id}_color = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        viewport.terrain.circlePixels(__wl_agt.state.x, __wl_agt.state.y, __wl_agt.state.size,
                                      (__wl_${this.id}_color & 0xFF0000) >> 16,
                                      (__wl_${this.id}_color & 0x00FF00) >> 8,
                                      __wl_${this.id}_color & 0x0000FF)
      `;
            }
        }
        Instructions.Stamp = Stamp;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class StampGrid extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                rets[0] = undefined;
                rets[1] = Constants.AST_DONE;
                throw new Error("unimplemented");
            }
            to_js_no_yield() {
                return `
        var color = ${this.args.data[0].to_js_no_yield()};
        viewport.terrain.gridSquarePixels(__wl_agt.state.x, __wl_agt.state.y,
                                          (color & 0xFF0000) >> 16,
                                          (color & 0x00FF00) >> 8,
                                          color & 0x0000FF)
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        var __wl_${this.id}_color = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        viewport.terrain.gridSquarePixels(__wl_agt.state.x, __wl_agt.state.y,
                                          (__wl_${this.id}_color & 0xFF0000) >> 16,
                                          (__wl_${this.id}_color & 0x00FF00) >> 8,
                                          __wl_${this.id}_color & 0x0000FF)
      `;
            }
        }
        Instructions.StampGrid = StampGrid;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class TerrainClear extends ASTNode {
            constructor() {
                super(0, 0); // numArgs = 0, numBranches = 0
            }
            fn(a, scope, args, rets) {
                rets[0] = undefined;
                rets[1] = Constants.AST_DONE;
                throw new Error("unimplemented");
            }
            to_js_no_yield() {
                return `
        viewport.terrain.clear()
      `;
            }
            to_js_setup() {
                return `
        viewport.terrain.clear()
      `;
            }
            to_js_final() {
                return ``;
            }
        }
        Instructions.TerrainClear = TerrainClear;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class TerrainColor extends ASTNode {
            constructor() {
                super(0, 0); // numArgs = 0, numBranches = 0
            }
            fn(a, scope, args, rets) {
                rets[0] = undefined;
                rets[1] = Constants.AST_DONE;
                throw new Error("unimplemented");
            }
            to_js_no_yield() {
                return `
        viewport.terrain.getPixelColorAt(__wl_agt.state.x, __wl_agt.state.y)
      `;
            }
            to_js_setup() {
                return `
        viewport.terrain.getPixelColorAt(__wl_agt.state.x, __wl_agt.state.y)
      `;
            }
            to_js_final() {
                return ``;
            }
        }
        Instructions.TerrainColor = TerrainColor;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../Common/Agent.ts" />
/// <reference path="UtilTraitHelper.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var Constants = Helper.Constants;
        // TODO: It appears this isn't even used anymore, as the code for getting
        // traits is now inside Execution.Agent, called from Helper.Utils.getTrait.
        // Can we remove this?
        var UtilTraitHelper = Compilation.Instructions.UtilTraitHelper;
        class TraitOf extends UtilTraitHelper {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var trait = args[0];
                var agt = args[1];
                rets[0] = this.traitHelper(agt, trait);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Helper.Utils.getTrait(${this.args.data[1].to_js_no_yield()}, ${this.args.data[0].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        var __wl_${this.id}_name = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_agt = ${this.args.data[1].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        Helper.Utils.getTrait(${this.args.data[1].to_js_no_yield()}, ${this.args.data[0].to_js_no_yield()})
      `;
            }
        }
        Instructions.TraitOf = TraitOf;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../Helper/Utils.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        var Utils = Helper.Utils;
        class VarDefine extends ASTNode {
            constructor() {
                super(3, 0); // numArgs = 3, numBranches = 0
                this.useParentScope = false;
            }
            fn(a, scope, args, rets) {
                scope.set(args[0], args[2]);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                if (this.useParentScope) {
                    return `
          __wl_thd.scope.set(${this.args.data[0].to_js_no_yield()}, ${this.args.data[2].to_js_no_yield()})
        `;
                }
                else {
                    var hash = Utils.hash(this.args.data[0].getData());
                    return `
          var __wl_var_${hash} = ${this.args.data[2].to_js_no_yield()}
        `;
                }
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[2].to_js_setup()};

        var __wl_${this.id}_name = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_val = ${this.args.data[2].to_js_final()};
      `;
            }
            to_js_final() {
                if (this.useParentScope) {
                    return `
          __wl_thd.scope.set(__wl_${this.id}_name, __wl_${this.id}_val);
        `;
                }
                else {
                    var hash = Utils.hash(this.args.data[0].getData());
                    return `
          var __wl_var_${hash} = __wl_${this.id}_val
        `;
                }
            }
        }
        Instructions.VarDefine = VarDefine;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../Helper/Utils.ts" />
/// <reference path="../../Helper/Logger.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        var Logger = Helper.Logger;
        var Utils = Helper.Utils;
        class VarGet extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
                this.useParentScope = false;
            }
            fn(a, scope, args, rets) {
                // Logger.assert(scope.has(args[0]));
                rets[0] = scope.get(args[0]);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                if (this.useParentScope) {
                    return `
          __wl_thd.scope.get(${this.args.data[0].to_js_no_yield()})
        `;
                }
                else {
                    var hash = Utils.hash(this.args.data[0].getData());
                    return `
          __wl_var_${hash}
        `;
                }
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_name = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                if (this.useParentScope) {
                    return `
          __wl_thd.scope.get(__wl_${this.id}_name);
        `;
                }
                else {
                    var hash = Utils.hash(this.args.data[0].getData());
                    return `
          __wl_var_${hash};
        `;
                }
            }
        }
        Instructions.VarGet = VarGet;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Logger.ts" />
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../Helper/Utils.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        var Logger = Helper.Logger;
        var Utils = Helper.Utils;
        class VarSet extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
                this.useParentScope = false;
            }
            fn(a, scope, args, rets) {
                // Logger.assert(scope.has(args[0]));
                scope.set(args[0], args[1]);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                if (this.useParentScope) {
                    return `
          __wl_thd.scope.set(${this.args.data[0].to_js_no_yield()}, ${this.args.data[1].to_js_no_yield()})
        `;
                }
                else {
                    var hash = Utils.hash(this.args.data[0].getData());
                    return `
          __wl_var_${hash} = ${this.args.data[1].to_js_no_yield()}
        `;
                }
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[2].to_js_setup()};

        var __wl_${this.id}_name = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_val = ${this.args.data[1].to_js_final()};
      `;
            }
            to_js_final() {
                if (this.useParentScope) {
                    return `
          __wl_thd.scope.set(__wl_${this.id}_name, __wl_${this.id}_val);
        `;
                }
                else {
                    var hash = Utils.hash(this.args.data[0].getData());
                    return `
          __wl_var_${hash} = __wl_${this.id}_val
        `;
                }
            }
        }
        Instructions.VarSet = VarSet;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../dts/widgets.d.ts" />
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class WgtAddDataLineGraph extends ASTNode {
            constructor() {
                super(4, 0); // numArgs = 4, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var lineGraphName = args[0];
                var seriesName = args[1];
                var x = args[2];
                var y = args[3];
                var graph = WidgetManager.getWidgetByName(lineGraphName);
                graph.addData(seriesName, x, y);
                graph.update();
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        var graph = WidgetManager.getWidgetByName(${this.args.data[0].to_js_no_yield()}); 
        graph.addData(
          String(${this.args.data[1].to_js_no_yield()}),
          Number(${this.args.data[2].to_js_no_yield()}),
          Number(${this.args.data[3].to_js_no_yield()})
        );
        graph.update();
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};
        ${this.args.data[2].to_js_setup()};
        ${this.args.data[3].to_js_setup()};

        var __wl_${this.id}_w_name = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_s_name = String(${this.args.data[1].to_js_final()});
        var __wl_${this.id}_x = Number(${this.args.data[2].to_js_final()});
        var __wl_${this.id}_y = Number(${this.args.data[3].to_js_final()});
      `;
            }
            to_js_final() {
                return `
        var graph = WidgetManager.getWidgetByName(${this.args.data[0].to_js_no_yield()}); 
        graph.addData(
          __wl_${this.id}_s_name,
          __wl_${this.id}_x,
          __wl_${this.id}_y
        );
        graph.update();
      `;
            }
        }
        Instructions.WgtAddDataLineGraph = WgtAddDataLineGraph;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../dts/widgets.d.ts" />
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class WgtButtonPush extends ASTNode {
            constructor() {
                super(1, 1); // numArgs = 1, numBranches = 1
            }
            fn(a, scope, args, rets) {
                var name = args[0];
                var button = WidgetManager.getWidgetByName(name);
                if (button.checkPushed()) {
                    rets[1] = Constants.AST_YIELD_REPEAT;
                }
                else {
                    rets[1] = Constants.AST_YIELD_REPEAT_NO_BRANCH;
                }
            }
            to_js_no_yield() {
                return `
        var __wl_${this.id}_btn_name = ${this.args.data[0].to_js_no_yield()};
        if (Common.State.pushedButtons.has(__wl_${this.id}_btn_name)) {
          ${this.branches[0].to_js()}
        }
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_btn_name = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        if (Common.State.pushedButtons.has(__wl_${this.id}_btn_name)) {
          ${this.branches[0].to_js()}
        }
      `;
            }
        }
        Instructions.WgtButtonPush = WgtButtonPush;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../dts/widgets.d.ts" />
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class WgtButtonToggle extends ASTNode {
            constructor() {
                super(1, 1); // numArgs = 1, numBranches = 1
            }
            fn(a, scope, args, rets) {
                var name = args[0];
                var button = WidgetManager.getWidgetByName(name);
                if (button.isToggled()) {
                    rets[1] = Constants.AST_YIELD_REPEAT;
                }
                else {
                    rets[1] = Constants.AST_YIELD_REPEAT_NO_BRANCH;
                }
            }
            to_js_no_yield() {
                return `
        var __wl_${this.id}_btn_name = ${this.args.data[0].to_js_no_yield()};
        if (
            (Common.State.toggledButtons.has(__wl_${this.id}_btn_name) &&
             !__wl_agt.disabledButtons.has(__wl_${this.id}_btn_name)
            ) ||
            __wl_agt.enabledButtons.has(__wl_${this.id}_btn_name)) {
          ${this.branches[0].to_js()}
        }
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_btn_name = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        if (
            (Common.State.toggledButtons.has(__wl_${this.id}_btn_name) &&
             !__wl_agt.disabledButtons.has(__wl_${this.id}_btn_name)
            ) ||
            __wl_agt.enabledButtons.has(__wl_${this.id}_btn_name)) {
          ${this.branches[0].to_js()}
        }
      `;
            }
        }
        Instructions.WgtButtonToggle = WgtButtonToggle;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../dts/widgets.d.ts" />
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class WgtButtonToggleSet extends ASTNode {
            constructor() {
                super(3, 0); // numArgs = 3, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var name = args[0];
                var button = WidgetManager.getWidgetByName(name);
                if (args[2] === "everyone") {
                    button.setValue(args[1] === "on");
                }
                else {
                    a.setToggleButton(name, args[1] === "on");
                }
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        var __wl_${this.id}_btn_toggle = WidgetManager.getWidgetByName(${this.args.data[0].to_js_no_yield()});
        var __wl_${this.id}_btn_state = Boolean(${this.args.data[1].to_js_no_yield()} === "on");

        if (${this.args.data[2].to_js_no_yield()}) {
          __wl_${this.id}_btn_toggle.setValue(__wl_${this.id}_btn_state);
        } else {
          __wl_agt.setToggleButton(__wl_${this.id}_btn_toggle, __wl_${this.id}_btn_state);
        }
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};
        ${this.args.data[2].to_js_setup()};

        var __wl_${this.id}_btn_name = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_btn_state = Boolean(${this.args.data[1].to_js_final()} === "on");
        var __wl_${this.id}_btn_target = String(${this.args.data[2].to_js_final()});
      `;
            }
            to_js_final() {
                return `
        var __wl_${this.id}_btn_toggle = WidgetManager.getWidgetByName(__wl_${this.id}_btn_name);

        if (__wl_${this.id}_btn_target == "everyone") {
          __wl_${this.id}_btn_toggle.setValue(__wl_${this.id}_btn_state);
        } else {
          __wl_agt.setToggleButton(__wl_${this.id}_btn_toggle, __wl_${this.id}_btn_state);
        }
      `;
            }
        }
        Instructions.WgtButtonToggleSet = WgtButtonToggleSet;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../dts/widgets.d.ts" />
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class WgtClearDataLineGraph extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var name = args[0];
                var graph = WidgetManager.getWidgetByName(name);
                graph.clear();
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        WidgetManager.getWidgetByName(${this.args.data[0].to_js_no_yield()}).clear()
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_w_name = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        WidgetManager.getWidgetByName(__wl_${this.id}_w_name).clear();
      `;
            }
        }
        Instructions.WgtClearDataLineGraph = WgtClearDataLineGraph;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../dts/widgets.d.ts" />
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class WgtGetLabel extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var name = args[0];
                var w = WidgetManager.getWidgetByName(name);
                rets[0] = w.getValue();
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        WidgetManager.getWidgetByName(${this.args.data[0].to_js_no_yield()}).getValue()
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_w_name = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        WidgetManager.getWidgetByName(__wl_${this.id}_w_name).getValue();
      `;
            }
        }
        Instructions.WgtGetLabel = WgtGetLabel;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../dts/widgets.d.ts" />
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class WgtGetSliderValue extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var name = args[0];
                var sw = WidgetManager.getWidgetByName(name);
                rets[0] = sw.getValue();
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        WidgetManager.getWidgetByName(${this.args.data[0].to_js_no_yield()}).getValue()
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_w_name = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        WidgetManager.getWidgetByName(__wl_${this.id}_w_name).getValue();
      `;
            }
        }
        Instructions.WgtGetSliderValue = WgtGetSliderValue;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../dts/widgets.d.ts" />
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class WgtGetText extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var name = args[0];
                var db = WidgetManager.getWidgetByName(name);
                rets[0] = db.getValue();
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Helper.Utils.guessType(WidgetManager.getWidgetByName(${this.args.data[0].to_js_no_yield()}).getValue())
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_w_name = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        Helper.Utils.guessType(WidgetManager.getWidgetByName(__wl_${this.id}_w_name).getValue());
      `;
            }
        }
        Instructions.WgtGetText = WgtGetText;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../dts/widgets.d.ts" />
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class WgtSetLabel extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var name = args[0];
                var val = String(args[1]);
                var w = WidgetManager.getWidgetByName(name);
                w.setValue(val);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        WidgetManager.getWidgetByName(${this.args.data[0].to_js_no_yield()}).setValue(
          String(${this.args.data[1].to_js_no_yield()})
        )
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        var __wl_${this.id}_w_name = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_val = String(${this.args.data[1].to_js_final()});
      `;
            }
            to_js_final() {
                return `
        WidgetManager.getWidgetByName(__wl_${this.id}_w_name).setValue(__wl_${this.id}_val);
      `;
            }
        }
        Instructions.WgtSetLabel = WgtSetLabel;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../dts/widgets.d.ts" />
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class WgtSetText extends ASTNode {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var name = args[0];
                var val = String(args[1]);
                var db = WidgetManager.getWidgetByName(name);
                db.setValue(val);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        WidgetManager.getWidgetByName(${this.args.data[0].to_js_no_yield()}).setValue(
          String(${this.args.data[1].to_js_no_yield()})
        )
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        var __wl_${this.id}_w_name = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_val = String(${this.args.data[1].to_js_final()});
      `;
            }
            to_js_final() {
                return `
        WidgetManager.getWidgetByName(__wl_${this.id}_w_name).setValue(__wl_${this.id}_val);
      `;
            }
        }
        Instructions.WgtSetText = WgtSetText;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../dts/widgets.d.ts" />
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class WgtShow extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var name = args[0];
                var widget = WidgetManager.getWidgetByName(name);
                widget.setVisibility(true);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        WidgetManager.getWidgetByName(${this.args.data[0].to_js_no_yield()}).setVisibility(true);
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_w_name = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        WidgetManager.getWidgetByName(__wl_${this.id}_w_name).setVisibility(true);
      `;
            }
        }
        Instructions.WgtShow = WgtShow;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../dts/widgets.d.ts" />
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        class WgtHide extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var name = args[0];
                var widget = WidgetManager.getWidgetByName(name);
                widget.setVisibility(false);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        WidgetManager.getWidgetByName(${this.args.data[0].to_js_no_yield()}).setVisibility(false);
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_w_name = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        WidgetManager.getWidgetByName(__wl_${this.id}_w_name).setVisibility(false);
      `;
            }
        }
        Instructions.WgtHide = WgtHide;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../Execution/AgentController.ts" />
/// <reference path="UtilTraitHelper.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var Constants = Helper.Constants;
        var AgentController = Execution.AgentController;
        var UtilTraitHelper = Compilation.Instructions.UtilTraitHelper;
        class WrldGetTrait extends UtilTraitHelper {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var traitName = String(args[0]);
                rets[0] = this.traitHelper(AgentController.worldInstance, traitName);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Execution.AgentController.worldInstance.getTrait(${this.args.data[0].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_name = ${this.args.data[0].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        Execution.AgentController.worldInstance.getTrait(__wl_${this.id}_name);
      `;
            }
        }
        Instructions.WrldGetTrait = WrldGetTrait;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../Execution/AgentController.ts" />
/// <reference path="UtilTraitHelper.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var Constants = Helper.Constants;
        var AgentController = Execution.AgentController;
        var UtilTraitHelper = Compilation.Instructions.UtilTraitHelper;
        class WrldSetTrait extends UtilTraitHelper {
            constructor() {
                super(2, 0); // numArgs = 2, numBranches = 0
            }
            fn(a, scope, args, rets) {
                var traitName = String(args[0]);
                var data = String(args[0]);
                AgentController.worldInstance.setTrait(traitName, data);
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Execution.AgentController.worldInstance.setTrait(${this.args.data[0].to_js_no_yield()}, ${this.args.data[1].to_js_no_yield()})
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};
        ${this.args.data[1].to_js_setup()};

        var __wl_${this.id}_name = ${this.args.data[0].to_js_final()};
        var __wl_${this.id}_val = ${this.args.data[1].to_js_final()};
      `;
            }
            to_js_final() {
                return `
        Execution.AgentController.worldInstance.setTrait(__wl_${this.id}_name, __wl_${this.id}_val);
      `;
            }
        }
        Instructions.WrldSetTrait = WrldSetTrait;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../Execution/AgentController.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        var AgentController = Execution.AgentController;
        class WrldTheWorld extends ASTNode {
            constructor() {
                super(0, 0); // numArgs = 0, numBranches = 0
            }
            fn(a, scope, args, rets) {
                rets[0] = AgentController.worldInstance;
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        Execution.AgentController.worldInstance
      `;
            }
            to_js_setup() {
                return ``;
            }
            to_js_final() {
                return `
        Execution.AgentController.worldInstance
      `;
            }
        }
        Instructions.WrldTheWorld = WrldTheWorld;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
/// <reference path="../../Common/State.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        var State = Common.State;
        class Yield extends ASTNode {
            constructor() {
                super(0, 0); // numArgs = 0, numBranches = 0
            }
            can_yield(procs) {
                return State.generatorSupported;
            }
            fn(a, scope, args, rets) {
                rets[1] = Constants.AST_YIELD;
            }
            to_js_no_yield() {
                return ``;
            }
            to_js_setup() {
                return ``;
            }
            to_js_final() {
                return `
        yield "${Constants.YIELD_NORMAL}"
      `;
            }
        }
        Instructions.Yield = Yield;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="Instructions/AgtCreate.ts" />
/// <reference path="Instructions/AgtCreateDo.ts" />
/// <reference path="Instructions/AgtDelete.ts" />
/// <reference path="Instructions/AgtDeleteAgent.ts" />
/// <reference path="Instructions/AgtDeleteEveryone.ts" />
/// <reference path="Instructions/AgtMe.ts" />
/// <reference path="Instructions/AgtMyParent.ts" />
/// <reference path="Instructions/CalcAbs.ts" />
/// <reference path="Instructions/CalcArcSinCosTan.ts" />
/// <reference path="Instructions/CalcDifference.ts" />
/// <reference path="Instructions/CalcLn.ts" />
/// <reference path="Instructions/CalcLog.ts" />
/// <reference path="Instructions/CalcMaxMin.ts" />
/// <reference path="Instructions/CalcPower.ts" />
/// <reference path="Instructions/CalcProduct.ts" />
/// <reference path="Instructions/CalcQuotient.ts" />
/// <reference path="Instructions/CalcRemainder.ts" />
/// <reference path="Instructions/CalcRound.ts" />
/// <reference path="Instructions/CalcSquareRoot.ts" />
/// <reference path="Instructions/CalcSum.ts" />
/// <reference path="Instructions/CalcTrigSinCosTan.ts" />
/// <reference path="Instructions/Clock.ts" />
/// <reference path="Instructions/ClockSet.ts" />
/// <reference path="Instructions/Collidee.ts" />
/// <reference path="Instructions/ColorOptions.ts" />
/// <reference path="Instructions/ColorRGB.ts" />
/// <reference path="Instructions/CompAnd.ts" />
/// <reference path="Instructions/CompEquals.ts" />
/// <reference path="Instructions/CompNotEquals.ts" />
/// <reference path="Instructions/CompGreaterThan.ts" />
/// <reference path="Instructions/CompGreaterThanOrEqualTo.ts" />
/// <reference path="Instructions/CompLessThan.ts" />
/// <reference path="Instructions/CompLessThanOrEqualTo.ts" />
/// <reference path="Instructions/CompNot.ts" />
/// <reference path="Instructions/CompOr.ts" />
/// <reference path="Instructions/ConstantTrue.ts" />
/// <reference path="Instructions/ConstantFalse.ts" />
/// <reference path="Instructions/ConstantPi.ts" />
/// <reference path="Instructions/CameraTake.ts" />
/// <reference path="Instructions/Count.ts" />
/// <reference path="Instructions/CountWith.ts" />
/// <reference path="Instructions/DetectCollision.ts" />
/// <reference path="Instructions/DetectNearest.ts" />
/// <reference path="Instructions/DetectNearestWith.ts" />
/// <reference path="Instructions/FaceTowards.ts" />
/// <reference path="Instructions/GetMyTrait.ts" />
/// <reference path="Instructions/If.ts" />
/// <reference path="Instructions/IfElse.ts" />
/// <reference path="Instructions/KeyHeld.ts" />
/// <reference path="Instructions/KeyTyped.ts" />
/// <reference path="Instructions/List.ts" />
/// <reference path="Instructions/ListContains.ts" />
/// <reference path="Instructions/ListGet.ts" />
/// <reference path="Instructions/ListInsert.ts" />
/// <reference path="Instructions/ListLength.ts" />
/// <reference path="Instructions/ListSplice.ts" />
/// <reference path="Instructions/LoopRepeat.ts" />
/// <reference path="Instructions/LoopWhile.ts" />
/// <reference path="Instructions/MoveBackward.ts" />
/// <reference path="Instructions/MoveDown.ts" />
/// <reference path="Instructions/MoveForward.ts" />
/// <reference path="Instructions/MoveLeft.ts" />
/// <reference path="Instructions/MoveRight.ts" />
/// <reference path="Instructions/MoveTeleport.ts" />
/// <reference path="Instructions/MoveUp.ts" />
/// <reference path="Instructions/PrintToJSConsole.ts" />
/// <reference path="Instructions/ProcCall.ts" />
/// <reference path="Instructions/ProcParam.ts" />
/// <reference path="Instructions/ProcReturn.ts" />
/// <reference path="Instructions/Procedure.ts" />
/// <reference path="Instructions/RandomDecimal.ts" />
/// <reference path="Instructions/RandomInteger.ts" />
/// <reference path="Instructions/RandomPercent.ts" />
/// <reference path="Instructions/Scatter.ts" />
/// <reference path="Instructions/ScatterEveryone.ts" />
/// <reference path="Instructions/SendDataToBackend.ts" />
/// <reference path="Instructions/SetMyTrait.ts" />
/// <reference path="Instructions/SetPen.ts" />
/// <reference path="Instructions/ShapeOptions.ts" />
/// <reference path="Instructions/SoundOptions.ts" />
/// <reference path="Instructions/SoundPlay.ts" />
/// <reference path="Instructions/Stamp.ts" />
/// <reference path="Instructions/StampGrid.ts" />
/// <reference path="Instructions/TerrainClear.ts" />
/// <reference path="Instructions/TerrainColor.ts" />
/// <reference path="Instructions/TraitOf.ts" />
/// <reference path="Instructions/VarDefine.ts" />
/// <reference path="Instructions/VarGet.ts" />
/// <reference path="Instructions/VarSet.ts" />
/// <reference path="Instructions/WgtAddDataLineGraph.ts" />
/// <reference path="Instructions/WgtButtonPush.ts" />
/// <reference path="Instructions/WgtButtonToggle.ts" />
/// <reference path="Instructions/WgtButtonToggleSet.ts" />
/// <reference path="Instructions/WgtClearDataLineGraph.ts" />
/// <reference path="Instructions/WgtGetLabel.ts" />
/// <reference path="Instructions/WgtGetSliderValue.ts" />
/// <reference path="Instructions/WgtGetText.ts" />
/// <reference path="Instructions/WgtSetLabel.ts" />
/// <reference path="Instructions/WgtSetText.ts" />
/// <reference path="Instructions/WgtShow.ts" />
/// <reference path="Instructions/WgtHide.ts" />
/// <reference path="Instructions/WrldGetTrait.ts" />
/// <reference path="Instructions/WrldSetTrait.ts" />
/// <reference path="Instructions/WrldTheWorld.ts" />
/// <reference path="Instructions/Yield.ts" />
/// <reference path="../Helper/Logger.ts" />
/// <reference path="../DataStructures/BlockPacket.ts" />
/// <reference path="../DataStructures/AST.ts" />
var Compilation;
(function (Compilation) {
    "use strict";
    var AgtCreate = Compilation.Instructions.AgtCreate;
    var AgtCreateDo = Compilation.Instructions.AgtCreateDo;
    var AgtDelete = Compilation.Instructions.AgtDelete;
    var AgtDeleteAgent = Compilation.Instructions.AgtDeleteAgent;
    var AgtDeleteEveryone = Compilation.Instructions.AgtDeleteEveryone;
    var AgtMe = Compilation.Instructions.AgtMe;
    var AgtMyParent = Compilation.Instructions.AgtMyParent;
    var CalcAbs = Compilation.Instructions.CalcAbs;
    var CalcArcSinCosTan = Compilation.Instructions.CalcArcSinCosTan;
    var CalcDifference = Compilation.Instructions.CalcDifference;
    var CalcLn = Compilation.Instructions.CalcLn;
    var CalcLog = Compilation.Instructions.CalcLog;
    var CalcMaxMin = Compilation.Instructions.CalcMaxMin;
    var CalcPower = Compilation.Instructions.CalcPower;
    var CalcProduct = Compilation.Instructions.CalcProduct;
    var CalcQuotient = Compilation.Instructions.CalcQuotient;
    var CalcRemainder = Compilation.Instructions.CalcRemainder;
    var CalcRound = Compilation.Instructions.CalcRound;
    var CalcSquareRoot = Compilation.Instructions.CalcSquareRoot;
    var CalcSum = Compilation.Instructions.CalcSum;
    var CalcTrigSinCosTan = Compilation.Instructions.CalcTrigSinCosTan;
    var Clock = Compilation.Instructions.Clock;
    var ClockSet = Compilation.Instructions.ClockSet;
    var CameraTake = Compilation.Instructions.CameraTake;
    var Collidee = Compilation.Instructions.Collidee;
    var ColorOptions = Compilation.Instructions.ColorOptions;
    var ColorRGB = Compilation.Instructions.ColorRGB;
    var CompAnd = Compilation.Instructions.CompAnd;
    var CompEquals = Compilation.Instructions.CompEquals;
    var CompNotEquals = Compilation.Instructions.CompNotEquals;
    var CompGreaterThan = Compilation.Instructions.CompGreaterThan;
    var CompGreaterThanOrEqualTo = Compilation.Instructions.CompGreaterThanOrEqualTo;
    var CompLessThan = Compilation.Instructions.CompLessThan;
    var CompLessThanOrEqualTo = Compilation.Instructions.CompLessThanOrEqualTo;
    var CompNot = Compilation.Instructions.CompNot;
    var CompOr = Compilation.Instructions.CompOr;
    var ConstantTrue = Compilation.Instructions.ConstantTrue;
    var ConstantFalse = Compilation.Instructions.ConstantFalse;
    var ConstantPi = Compilation.Instructions.ConstantPi;
    var Count = Compilation.Instructions.Count;
    var CountWith = Compilation.Instructions.CountWith;
    var DetectCollision = Compilation.Instructions.DetectCollision;
    var DetectNearest = Compilation.Instructions.DetectNearest;
    var DetectNearestWith = Compilation.Instructions.DetectNearestWith;
    var FaceTowards = Compilation.Instructions.FaceTowards;
    var GetMyTrait = Compilation.Instructions.GetMyTrait;
    var If = Compilation.Instructions.If;
    var IfElse = Compilation.Instructions.IfElse;
    var KeyHeld = Compilation.Instructions.KeyHeld;
    var KeyTyped = Compilation.Instructions.KeyTyped;
    var List = Compilation.Instructions.CompOr;
    var ListContains = Compilation.Instructions.ListContains;
    var ListGet = Compilation.Instructions.ListGet;
    var ListInsert = Compilation.Instructions.ListInsert;
    var ListLength = Compilation.Instructions.ListLength;
    var ListSplice = Compilation.Instructions.ListSplice;
    var LoopRepeat = Compilation.Instructions.LoopRepeat;
    var LoopWhile = Compilation.Instructions.LoopWhile;
    var MoveBackward = Compilation.Instructions.MoveBackward;
    var MoveDown = Compilation.Instructions.MoveDown;
    var MoveForward = Compilation.Instructions.MoveForward;
    var MoveLeft = Compilation.Instructions.MoveLeft;
    var MoveRight = Compilation.Instructions.MoveRight;
    var MoveTeleport = Compilation.Instructions.MoveTeleport;
    var MoveUp = Compilation.Instructions.MoveUp;
    var PrintToJSConsole = Compilation.Instructions.PrintToJSConsole;
    var ProcCall = Compilation.Instructions.ProcCall;
    var ProcParam = Compilation.Instructions.ProcParam;
    var ProcReturn = Compilation.Instructions.ProcReturn;
    var Procedure = Compilation.Instructions.Procedure;
    var RandomDecimal = Compilation.Instructions.RandomDecimal;
    var RandomInteger = Compilation.Instructions.RandomInteger;
    var RandomPercent = Compilation.Instructions.RandomPercent;
    var Scatter = Compilation.Instructions.Scatter;
    var ScatterEveryone = Compilation.Instructions.ScatterEveryone;
    var SendDataToBackend = Compilation.Instructions.SendDataToBackend;
    var SetMyTrait = Compilation.Instructions.SetMyTrait;
    var SetPen = Compilation.Instructions.SetPen;
    var ShapeOptions = Compilation.Instructions.ShapeOptions;
    var SoundOptions = Compilation.Instructions.SoundOptions;
    var SoundPlay = Compilation.Instructions.SoundPlay;
    var Stamp = Compilation.Instructions.Stamp;
    var StampGrid = Compilation.Instructions.StampGrid;
    var TerrainClear = Compilation.Instructions.TerrainClear;
    var TerrainColor = Compilation.Instructions.TerrainColor;
    var TraitOf = Compilation.Instructions.TraitOf;
    var VarDefine = Compilation.Instructions.VarDefine;
    var VarGet = Compilation.Instructions.VarGet;
    var VarSet = Compilation.Instructions.VarSet;
    var WgtAddDataLineGraph = Compilation.Instructions.WgtAddDataLineGraph;
    var WgtButtonPush = Compilation.Instructions.WgtButtonPush;
    var WgtButtonToggle = Compilation.Instructions.WgtButtonToggle;
    var WgtButtonToggleSet = Compilation.Instructions.WgtButtonToggleSet;
    var WgtClearDataLineGraph = Compilation.Instructions.WgtClearDataLineGraph;
    var WgtGetLabel = Compilation.Instructions.WgtGetLabel;
    var WgtGetSliderValue = Compilation.Instructions.WgtGetSliderValue;
    var WgtGetText = Compilation.Instructions.WgtGetText;
    var WgtSetLabel = Compilation.Instructions.WgtSetLabel;
    var WgtSetText = Compilation.Instructions.WgtSetText;
    var WgtShow = Compilation.Instructions.WgtShow;
    var WgtHide = Compilation.Instructions.WgtHide;
    var WrldGetTrait = Compilation.Instructions.WrldGetTrait;
    var WrldSetTrait = Compilation.Instructions.WrldSetTrait;
    var WrldTheWorld = Compilation.Instructions.WrldTheWorld;
    var Yield = Compilation.Instructions.Yield;
    var Logger = Helper.Logger;
    class BlockTable {
        static makeASTNode(bp) {
            // Logger.log(`Making ASTNode for ${bp}`);
            var name = bp.getName();
            var maker = Compilation.BlockTable.table.get(name);
            if (maker === undefined) {
                Logger.error(`Unable to find a match for ${name}`);
                return undefined;
            }
            var node = new maker();
            node.blockID = bp.getID();
            return node;
        }
    }
    BlockTable.table = new Map([
        // Agents
        ["agt-create", AgtCreate],
        ["agt-create-do", AgtCreateDo],
        ["agt-delete", AgtDelete],
        ["agt-delete-everyone", AgtDeleteEveryone],
        ["agt-delete-agent", AgtDeleteAgent],
        ["scatter", Scatter],
        ["scatter-everyone", ScatterEveryone],
        ["camera-take", CameraTake],
        ["agt-me", AgtMe],
        ["agt-my-parent", AgtMyParent],
        // Detection
        ["collision", DetectCollision],
        ["collidee", Collidee],
        ["count", Count],
        ["count-with", CountWith],
        ["detect-nearest", DetectNearest],
        ["detect-nearest-with", DetectNearestWith],
        // Environment
        ["terrain-clear", TerrainClear],
        ["stamp", Stamp],
        ["stamp-grid", StampGrid],
        ["pen", SetPen],
        ["terrain-color", TerrainColor],
        ["clock", Clock],
        ["clock-set", ClockSet],
        ["wrld-get-trait", WrldGetTrait],
        ["wrld-set-trait", WrldSetTrait],
        ["wrld-the-world", WrldTheWorld],
        // Interface
        ["wgt-button-push", WgtButtonPush],
        ["wgt-button-toggle", WgtButtonToggle],
        ["wgt-button-toggle-set", WgtButtonToggleSet],
        ["wgt-hide", WgtHide],
        ["wgt-show", WgtShow],
        ["wgt-set-text", WgtSetText],
        ["wgt-get-text", WgtGetText],
        ["wgt-set-label", WgtSetLabel],
        ["wgt-get-label", WgtGetLabel],
        ["wgt-slider", WgtGetSliderValue],
        ["wgt-line-graph", WgtAddDataLineGraph],
        ["wgt-line-graph-clear", WgtClearDataLineGraph],
        // Keyboard
        ["key-typed", KeyTyped],
        ["key-held", KeyHeld],
        // List
        ["list", List],
        ["list-splice", ListSplice],
        ["list-contains", ListContains],
        ["list-get", ListGet],
        ["list-insert", ListInsert],
        ["list-Length", ListLength],
        // Logic
        ["if", If],
        ["ifelse", IfElse],
        ["loop-while", LoopWhile],
        ["random-chance", RandomPercent],
        ["loop-repeat", LoopRepeat],
        ["yield", Yield],
        ["comp-and", CompAnd],
        ["comp-less-than", CompLessThan],
        ["comp-greater-than", CompGreaterThan],
        ["comp-less-than-or-equal-to", CompLessThanOrEqualTo],
        ["comp-greater-than-or-equal-to", CompGreaterThanOrEqualTo],
        ["comp-equals", CompEquals],
        ["comp-not", CompNot],
        ["comp-not-equals", CompNotEquals],
        ["comp-or", CompOr],
        ["constant-true", ConstantTrue],
        ["constant-false", ConstantFalse],
        // Math
        ["calc-abs", CalcAbs],
        ["calc-arcsincostan", CalcArcSinCosTan],
        ["calc-difference", CalcDifference],
        ["calc-ln", CalcLn],
        ["calc-log", CalcLog],
        ["calc-min-max", CalcMaxMin],
        ["calc-power", CalcPower],
        ["calc-product", CalcProduct],
        ["calc-quotient", CalcQuotient],
        ["calc-remainder", CalcRemainder],
        ["calc-round", CalcRound],
        ["calc-sincostan", CalcTrigSinCosTan],
        ["calc-sum", CalcSum],
        ["calc-squareroot", CalcSquareRoot],
        ["random-decimal", RandomDecimal],
        ["random-integer", RandomInteger],
        ["constant-pi", ConstantPi],
        // Movement
        ["move-forward", MoveForward],
        ["move-backwards", MoveBackward],
        ["move-left", MoveLeft],
        ["move-right", MoveRight],
        ["move-up", MoveUp],
        ["move-down", MoveDown],
        ["move-face-towards", FaceTowards],
        ["move-teleport", MoveTeleport],
        // Procedures
        ["procedure", Procedure],
        ["proc-call", ProcCall],
        ["proc-call-return", ProcCall],
        ["proc-param", ProcParam],
        ["proc-return-early", ProcReturn],
        // Sounds
        ["sound-options", SoundOptions],
        ["sound-play", SoundPlay],
        // Traits
        ["trait-get", GetMyTrait],
        ["trait-set", SetMyTrait],
        ["trait-of", TraitOf],
        ["color-rgb", ColorRGB],
        ["color-options", ColorOptions],
        ["shape-options", ShapeOptions],
        ["shape-asset", ShapeOptions],
        // Variables
        ["var-define", VarDefine],
        ["var-set", VarSet],
        ["var-value", VarGet],
        // Debugger
        ["sendDataToBackend", SendDataToBackend],
        ["printToJS", PrintToJSConsole],
        ["printToJS-list", PrintToJSConsole],
        ["printToJS-boolean", PrintToJSConsole],
    ]);
    Compilation.BlockTable = BlockTable;
})(Compilation || (Compilation = {}));
/// <reference path="../DataStructures/BlockPacket.ts" />
/// <reference path="../DataStructures/AST.ts" />
/// <reference path="../Common/ASTNode.ts" />
/// <reference path="../Common/State.ts" />
/// <reference path="../Common/Breed.ts" />
/// <reference path="../Common/Agent.ts" />
/// <reference path="../Common/Thread.ts" />
/// <reference path="../Helper/Logger.ts" />
/// <reference path="../Helper/Utils.ts" />
/// <reference path="../Execution/Threads/GeneratorRepeatThread.ts" />
/// <reference path="../Execution/Threads/FunctionRepeatThread.ts" />
/// <reference path="../Execution/Threads/CollisionThread.ts" />
/// <reference path="../Execution/AgentController.ts" />
/// <reference path="../Common/Procedure.ts" />
/// <reference path="BlockTable.ts" />
/// <reference path="BlocksReader.ts" />
/// <reference path="Instructions/ProcParam.ts" />
var Compilation;
(function (Compilation) {
    "use strict";
    var AgentController = Execution.AgentController;
    var State = Common.State;
    var Logger = Helper.Logger;
    var BlocksReader = Compilation.BlocksReader;
    var BlockTable = Compilation.BlockTable;
    var ASTList = DataStructures.ASTList;
    var UtilEvalData = DataStructures.UtilEvalData;
    var Procedure = Common.Procedure;
    var GeneratorRepeatThread = Execution.Threads.GeneratorRepeatThread;
    var FunctionRepeatThread = Execution.Threads.FunctionRepeatThread;
    var CollisionThread = Execution.Threads.CollisionThread;
    var AgtCreateDo = Compilation.Instructions.AgtCreateDo;
    var VarGet = Compilation.Instructions.VarGet;
    var VarSet = Compilation.Instructions.VarSet;
    var VarDefine = Compilation.Instructions.VarDefine;
    class Compiler {
        static compileAll() {
            for (var [procName, procNode] of State.procedureRoots) {
                if (procNode.can_yield(new Set())) {
                    State.procedureGenerators.set(procName, procNode.make_generator());
                }
                else {
                    State.procedureFunctions.set(procName, procNode.make_function());
                }
            }
            for (var breedID = 0, len = State.buttonMap.length; breedID < len; breedID++) {
                var nodes = State.buttonMap[breedID];
                if (nodes !== undefined) {
                    for (var node of nodes) {
                        Compilation.Compiler.compileNode(breedID, node);
                    }
                }
            }
            for (var collisionDict of State.collisionDict.values()) {
                for (var node of collisionDict.values()) {
                    Compilation.Compiler.compileNode(undefined, node);
                }
            }
            // get the possible colliding breed pairs
            var breedIDs = AgentController.getBreedIDs();
            var everyoneID = AgentController.EVERYONE.id;
            if (State.collisionDict.get(everyoneID).size > 0) {
                State.collidingBreeds = new Set(breedIDs);
            }
            else {
                State.collidingBreeds = new Set();
                for (var i = 0; i < breedIDs.length; i++) {
                    var breedID = breedIDs[i];
                    if (State.collisionDict.get(breedID).size > 0) {
                        State.collidingBreeds.add(breedID);
                    }
                }
            }
            for (var collidingBreed of State.collidingBreeds) {
                if (State.collisionDict.get(everyoneID).has(everyoneID) ||
                    State.collisionDict.get(collidingBreed).has(everyoneID)) {
                    State.collidedBreeds.set(collidingBreed, breedIDs.slice(0));
                }
                else {
                    State.collidedBreeds.set(collidingBreed, Array.from([
                        ...State.collisionDict.get(everyoneID).keys(),
                        ...State.collisionDict.get(collidingBreed).keys(),
                    ]));
                }
            }
        }
        static compileNode(breedID, node) {
            var buttonName = State.jsBtnNames.get(node);
            if (node.can_yield(new Set())) {
                node.yields = true;
                var gen = node.make_generator();
                State.jsGenerators.set(node, gen);
                if (breedID === AgentController.WORLD.id) {
                    var world = AgentController.worldInstance;
                    var jsThread = new GeneratorRepeatThread(world, buttonName, gen);
                    world.jsthreads.push(jsThread);
                }
            }
            else {
                node.yields = false;
                var fun = node.make_function();
                State.jsFunctions.set(node, fun);
                if (breedID === AgentController.WORLD.id) {
                    var world = AgentController.worldInstance;
                    var thread = new FunctionRepeatThread(world, buttonName, fun);
                    world.jsthreads.push(thread);
                }
            }
        }
        // All at once
        static createTopBlock(bp) {
            var topLevelNames = ["collision", "procedure", "wgt-button-push", "wgt-button-toggle"];
            if (topLevelNames.indexOf(bp.getName()) < 0) {
                return;
            }
            var node;
            if (bp.getName() === "procedure") {
                node = Compilation.Compiler.createProcedure(bp);
            }
            else {
                node = Compilation.Compiler.createHelper(bp, undefined, undefined);
            }
            var breedName = BlocksReader.getPageName(bp);
            var breed = AgentController.getByName(breedName);
            switch (bp.getName()) {
                case "collision":
                    {
                        var otherBreedName = BlocksReader.getLabel(bp.getID(), 0);
                        var otherBreed = AgentController.getByName(otherBreedName);
                        State.collisionDict.get(breed.id).set(otherBreed.id, node);
                        State.collisionsOn = true;
                        State.binningOn = true;
                    }
                    break;
                case "procedure":
                    {
                        var procName = String(BlocksReader.getInternalArg(bp.getID(), 0));
                        var fullProcName = `${breed.name}${procName}`;
                        State.procedureRoots.set(fullProcName, node);
                        var proc = Procedure.makeNew(fullProcName);
                        for (var i = 2; i < node.args.data.length; i++) {
                            proc.params.push(node.args.data[i].getData());
                        }
                    }
                    break;
                case "wgt-button-push":
                    {
                        State.buttonMap[breed.id].push(node);
                        var btnName = node.args.data[0].getData();
                        State.jsBtnNames.set(node, btnName);
                    }
                    break;
                case "wgt-button-toggle":
                    {
                        State.buttonMap[breed.id].push(node);
                        var btnName = node.args.data[0].getData();
                        State.jsBtnNames.set(node, btnName);
                    }
                    break;
                default: {
                    throw new Error(`Unknown block packet type: ${bp.getName()}`);
                }
            }
            // if "AgtCreateDo" is somewhere in this tree, then mark all variable instructions with
            // useParentScope = true
            var nodes = [node];
            var agtCreateDoPresent = false;
            while (nodes.length > 0) {
                var curNode = nodes.splice(0, 1)[0]; // pop from the head of the queue
                if (curNode === undefined) {
                    continue;
                }
                if (curNode instanceof AgtCreateDo) {
                    agtCreateDoPresent = true;
                    break;
                }
                for (var arg of curNode.args.data) {
                    nodes.push(arg);
                }
                for (var branch of curNode.branches) {
                    for (var childNode of branch.data) {
                        nodes.push(childNode);
                    }
                }
            }
            if (agtCreateDoPresent) {
                nodes = [node];
                while (nodes.length > 0) {
                    var curNode = nodes.splice(0, 1)[0]; // pop from the head of the queue
                    if (curNode === undefined) {
                        continue;
                    }
                    if (curNode instanceof VarDefine || curNode instanceof VarSet || curNode instanceof VarGet) {
                        curNode.useParentScope = true;
                    }
                    for (var arg of curNode.args.data) {
                        nodes.push(arg);
                    }
                    for (var branch of curNode.branches) {
                        for (var childNode of branch.data) {
                            nodes.push(childNode);
                        }
                    }
                }
            }
        }
        static createProcedure(bp) {
            var node = BlockTable.makeASTNode(bp);
            var len = BlocksReader.getSBLength(bp.getID());
            var numArgs = Math.floor(len / 3) - 1;
            // set the name
            var breedName = BlocksReader.getPageName(bp);
            var procName = BlocksReader.getInternalArg(bp.getID(), 0);
            node.args.data[0] = new UtilEvalData(`${breedName}${procName}`);
            // set the return socket, if any
            if (len % 3 === 2) {
                var arg = BlocksReader.getInternalArg(bp.getID(), len - (len % 3));
                if (typeof (arg) === "string") {
                    node.args[1] = new UtilEvalData(arg);
                }
                else {
                    var blockID = Number(arg.getID().replace(/^\D+/g, ""));
                    node.args[1] = Compilation.Compiler.createHelper(BlocksReader.getBlock(blockID), node, node);
                }
            }
            for (var idx = 0; idx < numArgs; idx++) {
                var arg = BlocksReader.getInternalArg(bp.getID(), 2 + 3 * idx);
                node.args.data[2 + idx] = new UtilEvalData(arg);
            }
            node.numArgs = node.args.data.length;
            node.branches[0] = new ASTList();
            var branchBP = BlocksReader.getSB(bp.getID(), len - (len % 3) - 1);
            while (branchBP !== undefined) {
                node.branches[0].data.push(Compilation.Compiler.createHelper(branchBP, node, node));
                branchBP = BlocksReader.getAfterBlock(branchBP);
            }
            return node;
        }
        static createHelper(bp, parent, procedureRoot) {
            var node = BlockTable.makeASTNode(bp);
            // Logger.assert(bp.getName() !== "procedure");
            var blockName = bp.getName();
            if (blockName === "proc-call" || blockName === "proc-call-return") {
                node.numArgs = BlocksReader.getSBLength(bp.getID());
            }
            else if (blockName === "proc-param") {
                node.procName = procedureRoot.args.data[0].getData();
            }
            else if (blockName === "count" || blockName === "count-with" ||
                blockName === "detect-nearest" || blockName === "detect-nearest-with") {
                State.binningOn = true;
            }
            var idx = 0;
            for (var aIdx = 0; aIdx < node.numArgs; aIdx++, idx++) {
                var arg = BlocksReader.getInternalArg(bp.getID(), idx);
                if (typeof (arg) === "string") {
                    node.args.data[aIdx] = new UtilEvalData(arg);
                }
                else {
                    var blockID = Number(arg.getID().replace(/^\D+/g, ""));
                    node.args.data[aIdx] = Compilation.Compiler.createHelper(BlocksReader.getBlock(blockID), node, procedureRoot);
                }
            }
            for (var bIdx = 0; bIdx < node.numBranches; bIdx++, idx++) {
                node.branches[bIdx] = new ASTList();
                var branchBP = BlocksReader.getSB(bp.getID(), idx);
                while (branchBP !== undefined) {
                    node.branches[bIdx].data.push(Compilation.Compiler.createHelper(branchBP, node, procedureRoot));
                    branchBP = BlocksReader.getAfterBlock(branchBP);
                }
            }
            return node;
        }
        static make_thread(node, a) {
            var buttonName = State.jsBtnNames.get(node);
            if (node.yields) {
                return new GeneratorRepeatThread(a, buttonName, State.jsGenerators.get(node));
            }
            else {
                return new FunctionRepeatThread(a, buttonName, State.jsFunctions.get(node));
            }
        }
        static make_collision_thread(node, a, b) {
            // Logger.assert(node.yields === true);
            return new CollisionThread(a, State.jsGenerators.get(node), b);
        }
    }
    Compilation.Compiler = Compiler;
})(Compilation || (Compilation = {}));
/// <reference path="../Helper/Constants.ts" />
/// <reference path="../Helper/Logger.ts" />
/// <reference path="../Helper/Utils.ts" />
/// <reference path="../Common/State.ts" />
/// <reference path="../Common/Agent.ts" />
/// <reference path="../Common/Breed.ts" />
/// <reference path="../Common/Thread.ts" />
/// <reference path="../Common/Trait.ts" />
/// <reference path="../Compilation/Compiler.ts" />
/// <reference path="../DataStructures/Bin.ts" />
/// <reference path="../DataStructures/AST.ts" />
/// <reference path="../dts/viewport.d.ts" />
/// <reference path="Threads/GeneratorRepeatThread.ts" />
/// <reference path="Collisions.ts" />
/// <reference path="AgentController.ts" />
/// <reference path="Threads/GeneratorRepeatThread.ts" />
var Execution;
(function (Execution) {
    "use strict";
    var State = Common.State;
    var Compiler = Compilation.Compiler;
    var AgentController = Execution.AgentController;
    var Constants = Helper.Constants;
    var Collisions = Execution.Collisions;
    var Logger = Helper.Logger;
    var Utils = Helper.Utils;
    class Agent {
        /**
         * Agents hold the state and threads of their WebLand representations. Note that by default, new agents
         * are added to the agent queue and initialized with any running threads of their breed.
         * @param snapshot:Boolean=False - setting this to true will 'snapshot' an agent instead of creating it,
         * thereby preventing it from being initialized with threads or added to the AgentQueue
         */
        constructor(breed, parent, state, snapShot) {
            this.isAgent = true;
            this.isPenDown = false;
            this.hasCamera = false;
            this.isDead = false;
            this.isSnapshot = false;
            ///////////////////////////AGENT ENGINE//////////////////////////
            this.threads = new Map();
            this.jsthreads = new Array();
            /** Binning system to assist smell */
            this.bins = [];
            this.jbins = [];
            this.disabledButtons = new Set();
            this.enabledButtons = new Set();
            // Logger.log(`Constructing a new ${breed}`);
            this.breed = breed;
            this.parent = parent;
            this.state = state || new Execution.AgentState();
            this.prevState = new Execution.AgentState();
            this.isSnapshot = snapShot;
            this.traits = new Array(this.breed.customTraits.length);
            if (this.isSnapshot) {
                this.id = this.parent.id;
                this.original = parent;
            }
            else {
                // snapshots will get their id's from the agent they are a clone of
                this.id = Execution.Agent.idBase++;
                this.cacheVisibleState();
                this.state.shape = breed.shape;
                // Compiles EVERYONE blocks and pushes to each agent's jsthreads
                var everyoneNodes = State.buttonMap[AgentController.EVERYONE.id] || [];
                for (var i = 0, len = everyoneNodes.length; i < len; i++) {
                    var node = everyoneNodes[i];
                    this.jsthreads.push(Compiler.make_thread(node, this));
                }
                var nodes = State.buttonMap[breed.id] || [];
                for (var i = 0, len = nodes.length; i < len; i++) {
                    var node = nodes[i];
                    this.jsthreads.push(Compiler.make_thread(node, this));
                }
                AgentController.insert(this);
            }
        }
        /**
         * Copies the values of all in-common custom traits from source to dest agent.
         */
        static copyCustomTraits(source, dest) {
            if (source.breed === dest.breed) {
                for (var traitID = 0, len = dest.traits.length; traitID < len; traitID++) {
                    dest.traits[traitID] = source.traits[traitID];
                }
            }
            // set previous state to be the source's current traits
            // (so hatchlings start at parent's position and move on from there)
            dest.prevState = source.state.copy();
        }
        static snapShot(a) {
            var newAgent = new Execution.Agent(a.breed, a, a.state.copy(), true);
            Execution.Agent.copyCustomTraits(a, newAgent);
            return newAgent;
        }
        updateBin() {
            if (State.binningOn) {
                Collisions.update(this);
            }
        }
        clone(breedName) {
            breedName = breedName || this.breed.name;
            var breed = AgentController.getByName(breedName);
            var newAgent = new Execution.Agent(breed, this, this.state.copy());
            Execution.Agent.copyCustomTraits(this, newAgent);
            return newAgent;
        }
        reset() {
            this.threads = new Map();
        }
        /**
         * Removes agent from queue and closes its threads
         */
        die() {
            if (!this.isDead) {
                // mark the agent as "dead" in case any blocks or the camera have a reference to it
                this.isDead = true;
                AgentController.remove(this);
                // forget who your parent is so that the parent can be garbage collected
                this.parent = undefined;
                if (this.hasCamera) {
                    viewport.setCameraAgent(undefined, undefined);
                }
            }
        }
        ////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////SETTERS//////////////////////////////////////////
        ////////////////////////////////////////////////////////////////////////////////////////
        safeSetColor(color) {
            this.state.color = (color % 0x1000000);
        }
        safeSetSize(size) {
            this.state.size = Math.max(size, 0);
        }
        ////////////////////////////////////////////////////////////////////////////////////////
        ////////////////////////////////////////MOVEMENT////////////////////////////////////////
        safeSetX(x) {
            this.state.x = Math.min(Math.max(-Constants.MAPSIZE, x), Constants.MAPSIZE);
        }
        safeSetY(y) {
            this.state.y = Math.min(Math.max(-Constants.MAPSIZE, y), Constants.MAPSIZE);
        }
        safeSetZ(z) {
            this.state.z = Math.min(Math.max(-Constants.MAPCEILING, z), Constants.MAPCEILING);
        }
        safeSetHeading(x) {
            this.state.heading = (x + 360) % 360; // convert negative to positive
        }
        safeSetShape(newShape) {
            this.state.shape = newShape;
        }
        scatter() {
            var size = Constants.MAPSIZE;
            var x = (Utils.random() * size * 2) - size;
            var y = (Utils.random() * size * 2) - size;
            this.state.x = x;
            this.state.y = y;
            this.state.heading = Utils.random() * 360;
            // update previous state as well to achieve a teleportation effect
            this.prevState = this.state.copy();
        }
        getTrait(trait) {
            switch (trait) {
                case "x":
                    return this.state.x;
                case "y":
                    return this.state.y;
                case "z":
                    return this.state.z;
                case "color":
                    return this.state.color;
                case "shape":
                    return this.state.shape;
                case "heading":
                    return this.state.heading;
                case "size":
                    return this.state.size;
                case "breed":
                    return this.breed.name;
                case "id":
                    return this.id;
                default:
                    var traitID = this.breed.getTraitID(trait);
                    var value = this.traits[traitID];
                    if (!isNaN(Number(value))) {
                        return Number(value);
                    }
                    return value;
            }
        }
        setTrait(trait, val) {
            switch (trait) {
                case "x":
                    this.safeSetX(Number(val));
                    return;
                case "y":
                    this.safeSetY(Number(val));
                    return;
                case "z":
                    this.safeSetZ(Number(val));
                    return;
                case "color":
                    this.safeSetColor(Number(val));
                    return;
                case "shape":
                    this.safeSetShape(String(val));
                    return;
                case "heading":
                    this.safeSetHeading(Number(val));
                    return;
                case "size":
                    this.safeSetSize(Number(val));
                    return;
                default:
                    var traitID = this.breed.getTraitID(trait);
                    this.traits[traitID] = val;
                    return;
            }
        }
        /**
         * Precalculates all of the bounces necessary to place the agent in an equivalent
         * location inside the map, and places the agent there.
         */
        bounce() {
            if (this.state.x > Constants.MAPSIZE) {
                this.state.x = (2 * Constants.MAPSIZE - this.state.x);
                this.safeSetHeading(180 - this.state.heading);
                this.bounce();
            }
            else if (this.state.x < -Constants.MAPSIZE) {
                this.state.x = (-2 * Constants.MAPSIZE - this.state.x);
                this.safeSetHeading(180 - this.state.heading);
                this.bounce();
            }
            else if (this.state.y > Constants.MAPSIZE) {
                this.state.y = (2 * Constants.MAPSIZE - this.state.y);
                this.safeSetHeading(-this.state.heading);
                this.bounce();
            }
            else if (this.state.y < -Constants.MAPSIZE) {
                this.state.y = (-2 * Constants.MAPSIZE - this.state.y);
                this.safeSetHeading(-this.state.heading);
                this.bounce();
            }
        }
        /**
         * Assumes that the agent's x and y have already been updated, but may be outside
         * the bounds of the terrain. If so, draws lines and reflects off edges until the
         * agent is located inside.
         * @param currentX, currentY - the starting location of the agent
         * @param deltaX, deltaY - the slope components (passed on through calls to avoid trig calls)
         */
        bounceDraw(currentX, currentY, deltaX, deltaY, r, g, b) {
            var oldX = currentX;
            var oldY = currentY;
            var distToLeft = (currentX + Constants.MAPSIZE) / -deltaX;
            var distToRight = (Constants.MAPSIZE - currentX) / deltaX;
            var distToBottom = (currentY + Constants.MAPSIZE) / -deltaY;
            var distToTop = (Constants.MAPSIZE - currentY) / deltaY;
            // we need to find the closest border more than 0 away
            distToLeft = distToLeft > 0 ? distToLeft : Infinity;
            distToRight = distToRight > 0 ? distToRight : Infinity;
            distToBottom = distToBottom > 0 ? distToBottom : Infinity;
            distToTop = distToTop > 0 ? distToTop : Infinity;
            var minDistance = Math.min(distToLeft, distToRight, distToBottom, distToTop);
            // recursively bounce off the nearest border and then continue...
            if (this.state.x < -Constants.MAPSIZE && minDistance == distToLeft) {
                this.state.x = (-2 * Constants.MAPSIZE - this.state.x);
                this.safeSetHeading(180 - this.state.heading);
                currentX = -Constants.MAPSIZE;
                currentY += distToLeft * deltaY;
                deltaX = -deltaX;
                viewport.terrain.line(oldX, oldY, currentX, currentY, this.state.size, r, g, b);
                this.bounceDraw(currentX, currentY, deltaX, deltaY, r, g, b);
            }
            else if (this.state.x > Constants.MAPSIZE && minDistance == distToRight) {
                this.state.x = (2 * Constants.MAPSIZE - this.state.x);
                this.safeSetHeading(180 - this.state.heading);
                currentX = Constants.MAPSIZE;
                currentY += distToRight * deltaY;
                deltaX = -deltaX;
                viewport.terrain.line(oldX, oldY, currentX, currentY, this.state.size, r, g, b);
                this.bounceDraw(currentX, currentY, deltaX, deltaY, r, g, b);
            }
            else if (this.state.y < -Constants.MAPSIZE && minDistance == distToBottom) {
                this.state.y = (-2 * Constants.MAPSIZE - this.state.y);
                this.safeSetHeading(-this.state.heading);
                currentX += distToBottom * deltaX;
                currentY = -Constants.MAPSIZE;
                deltaY = -deltaY;
                viewport.terrain.line(oldX, oldY, currentX, currentY, this.state.size, r, g, b);
                this.bounceDraw(currentX, currentY, deltaX, deltaY, r, g, b);
            }
            else if (this.state.y > Constants.MAPSIZE && minDistance == distToTop) {
                this.state.y = (2 * Constants.MAPSIZE - this.state.y);
                this.safeSetHeading(-this.state.heading);
                currentX += distToTop * deltaX;
                currentY = Constants.MAPSIZE;
                deltaY = -deltaY;
                viewport.terrain.line(oldX, oldY, currentX, currentY, this.state.size, r, g, b);
                this.bounceDraw(currentX, currentY, deltaX, deltaY, r, g, b);
            }
            else {
                viewport.terrain.line(oldX, oldY, this.state.x, this.state.y, this.state.size, r, g, b);
            }
        }
        faceTowards(a) {
            if (a !== undefined && a.isAgent) {
                var x = a.state.x;
                var y = a.state.y;
                if (this.state.x !== x || this.state.y !== y) {
                    this.safeSetHeading(Math.atan2(y - this.state.y, x - this.state.x) * 180 / Math.PI);
                }
            }
        }
        moveForward(amount) {
            var angle = this.state.heading / 180 * Math.PI;
            var oldX = this.state.x;
            var oldY = this.state.y;
            var deltaX = Math.cos(angle);
            var deltaY = Math.sin(angle);
            this.state.x += amount * deltaX; // dx;
            this.state.y += amount * deltaY; // dy;      
            if (this.isPenDown) {
                /* tslint:disable bitwise */
                var r = (this.state.color & 0xFF0000) >> 16;
                var g = (this.state.color & 0x00FF00) >> 8;
                var b = (this.state.color & 0x0000FF) >> 0;
                /* tslint:enable bitwise */
                this.bounceDraw(oldX, oldY, (amount < 0 ? -deltaX : deltaX), (amount < 0 ? -deltaY : deltaY), r, g, b);
            }
            else {
                this.bounce();
            }
        }
        equals(other) {
            return this.id === other.id;
        }
        cacheVisibleState() {
            this.prevState = this.state.copy();
        }
        setToggleButton(name, disable) {
            if (disable) {
                this.disabledButtons.add(name);
                this.enabledButtons.delete(name);
            }
            else {
                this.disabledButtons.delete(name);
                this.enabledButtons.add(name);
            }
        }
        isButtonEnabled(name) {
            // Logger.assert(!(this.disabledButtons.has(name) && this.enabledButtons.has(name)));
            return this.enabledButtons.has(name);
        }
        isButtonDisabled(name) {
            // Logger.assert(!(this.disabledButtons.has(name) && this.enabledButtons.has(name)));
            return this.disabledButtons.has(name);
        }
        toString() {
            return `<Agent ${this.id}, breed: ${this.breed}>`;
        }
    }
    Agent.idBase = 0;
    Execution.Agent = Agent;
})(Execution || (Execution = {}));
/// <reference path="../Common/State.ts" />
/// <reference path="../Common/Breed.ts" />
/// <reference path="../Common/Thread.ts" />
/// <reference path="../Compilation/Compiler.ts" />
/// <reference path="../Helper/Logger.ts" />
/// <reference path="../Helper/KeyManager.ts" />
/// <reference path="../Helper/Utils.ts" />
/// <reference path="../DataStructures/CollisionPair.ts" />
/// <reference path="../DataStructures/BlockPacket.ts" />
/// <reference path="../DataStructures/AST.ts" />
/// <reference path="../dts/widgets.d.ts" />
/// <reference path="Threads/SingleFunctionThread.ts" />
/// <reference path="Threads/SetupThread.ts" />
/// <reference path="Collisions.ts" />
/// <reference path="AgentController.ts" />
/// <reference path="Agent.ts" />
var Execution;
(function (Execution) {
    "use strict";
    var Compiler = Compilation.Compiler;
    var Agent = Execution.Agent;
    var State = Common.State;
    var SingleFunctionThread = Execution.Threads.SingleFunctionThread;
    var SetupThread = Execution.Threads.SetupThread;
    var AgentController = Execution.AgentController;
    var Collisions = Execution.Collisions;
    var Logger = Helper.Logger;
    var KeyManager = Helper.KeyManager;
    var PushButtonWidget = slnova.PushButtonWidget;
    var ToggleButtonWidget = slnova.ToggleButtonWidget;
    class Engine {
        static tick() {
            // var has better scoping than var, but has poorer performance so we use var for tight loops
            // see https://gist.github.com/jinpan/4ee227ba4699e433c8406b118bf73166
            /* tslint:disable no-var-keyword */
            // Logger.log(`Engine tick toJS ${State.clock}, ${AgentController.getAllAgents().length} agents`);
            var somethingRan = false;
            var pushButtons = WidgetManager.getWidgetsByType(PushButtonWidget);
            for (var i = 0; i < pushButtons.length; i++) {
                var pbw = pushButtons[i];
                if (pbw.checkPushed()) {
                    var btnName = pbw.getName();
                    if (State.pushButtonRunning.get(btnName)) {
                        Execution.Engine.killThreads(btnName);
                    }
                    else {
                        State.pushedButtons.add(btnName);
                    }
                }
            }
            State.pushButtonRunning.clear();
            var toggleButtons = WidgetManager.getWidgetsByType(ToggleButtonWidget);
            for (var i = 0; i < toggleButtons.length; i++) {
                var tbw = toggleButtons[i];
                if (tbw.isToggled()) {
                    State.toggledButtons.add(tbw.getName());
                }
            }
            var numAgents = AgentController.numAgents;
            if (State.pushedButtons.size > 0 || State.toggledButtons.size > 0 || State.runnable) {
                State.runnable = false;
                for (var i = 0; i < numAgents; i++) {
                    var a = AgentController.data[i];
                    a.prevState.copyFrom(a.state);
                    AgentController.prevStates[i] = a.prevState; // TODO djw - Why isn't this already the case???
                    var startX = a.state.x;
                    var startY = a.state.y;
                    var startS = a.state.size;
                    var finishedThreads = new Array();
                    for (var j = 0; j < a.jsthreads.length; j++) {
                        var done = a.jsthreads[j].step();
                        if (done) {
                            finishedThreads.push(j);
                        }
                        else {
                            State.runnable = State.runnable || a.jsthreads[j].yielded;
                        }
                        somethingRan = true;
                    }
                    for (var j = finishedThreads.length; j > 0; j--) {
                        a.jsthreads.splice(j - 1, 1);
                    }
                    if (State.binningOn) {
                        if (!a.isDead && (a.state.x !== startX || a.state.y !== startY || a.state.size !== startS)) {
                            a.updateBin();
                        }
                    }
                }
            }
            State.runnable = State.runnable || AgentController.numAgents > numAgents;
            if (State.collisionsOn && (somethingRan || State.collisionsLastRun)) {
                var collisions = Collisions.getCollisions();
                State.collisionsLastRun = (collisions.length > 0);
                somethingRan = somethingRan || State.collisionsLastRun;
                if (collisions.length > 0) {
                    // Logger.log(`# Collisions = ${collisions.length}`);
                    for (var i = 0; i < collisions.length; i++) {
                        var collision = collisions[i];
                        var a1 = collision.a;
                        var a2 = collision.b;
                        if (!a1.isDead && !a2.isDead) {
                            Execution.Engine.tryCollide(a1, a2);
                        }
                    }
                }
            }
            if (State.binningOn) {
                for (var i = 0; i < AgentController.numAgents; i++) {
                    var agent = AgentController.data[i];
                    if (agent.isDead && agent.jbins.length > 0) {
                        Collisions.remove(agent);
                    }
                }
            }
            AgentController.clearDead();
            KeyManager.tick();
            State.pushedButtons.clear();
            State.toggledButtons.clear();
            if (somethingRan) {
                State.clock++;
            }
            return somethingRan;
            /* tslint:enable no-var-keyword */
        }
        /**
         * Attempts to run collision code on two colliding agents. Both agents save their state, run collision code
         * on that state, and save any changes to the AgentList when finished
         * @returns Array the agents, updated after the collision
         */
        static tryCollide(agent1, agent2) {
            var agent1Copy = undefined;
            var agent2Copy = undefined;
            if (Execution.Engine.canCollide(agent1, agent2)) {
                // before colliding, snapshot each agent so that each
                // agent gets an unaltered copy of the other one rather than having
                // the first collision potentially mess up state before the second one.
                agent2Copy = Agent.snapShot(agent2);
                // Collide the two agents, using the copy of Agent 2 so it can't be messed up
                Execution.Engine.collide(agent1, agent2Copy);
            }
            if (Execution.Engine.canCollide(agent2, agent1)) {
                // if we didn't collide in the other direction, we still need to
                // copy Agent 1's data so Agent 1 can't be messed with via Agent 2's code
                agent1Copy = Agent.snapShot(agent1);
                Execution.Engine.collide(agent2, agent1Copy);
            }
        }
        /**
         * Returns whether or not two agents can collide with one another
         * @param collider: Agent the collider agent, who would run the code
         * @param collidee: Agent the other, colliding agent
         * @returns Boolean true if the two agents can collide, in the given order
         */
        static canCollide(collider, collidee) {
            return (State.collisionDict.get(AgentController.EVERYONE.id).has(AgentController.EVERYONE.id) ||
                State.collisionDict.get(AgentController.EVERYONE.id).has(collidee.breed.id) ||
                State.collisionDict.get(collider.breed.id).has(AgentController.EVERYONE.id) ||
                State.collisionDict.get(collider.breed.id).has(collidee.breed.id));
        }
        /**
         * Executes a one sided collision, returning the updated agent
         * @param collider: Agent the colliding agent executing the code
         * @param collidee: Agent the agent being collided with
         * @returns The agent, updated after the collision
         */
        static collide(collider, collidee) {
            var nodes = [
                State.collisionDict.get(AgentController.EVERYONE.id).get(AgentController.EVERYONE.id),
                State.collisionDict.get(AgentController.EVERYONE.id).get(collidee.breed.id),
                State.collisionDict.get(collider.breed.id).get(AgentController.EVERYONE.id),
                State.collisionDict.get(collider.breed.id).get(collidee.breed.id),
            ];
            for (var i = 0; i < 4; i++) {
                var node = nodes[i];
                if (node !== undefined) {
                    if (node.yields) {
                        var collisionThread = Compiler.make_collision_thread(node, collider, collidee);
                        var done = collisionThread.step();
                        if (!done) {
                            collider.jsthreads.push(collisionThread);
                        }
                    }
                    else {
                        collider.collidee = collidee;
                        State.jsFunctions.get(node)(collider, new SingleFunctionThread());
                        collider.collidee = undefined;
                    }
                }
            }
        }
        static killThreads(buttonName) {
            for (var i = 0; i < AgentController.numAgents; i++) {
                var agent = AgentController.data[i];
                for (var j = 0; j < agent.jsthreads.length; j++) {
                    var t = agent.jsthreads[j];
                    if (t.buttonName === buttonName) {
                        if (t instanceof SetupThread) {
                            agent.jsthreads.splice(j, 1);
                            j--;
                        }
                        else {
                            var rt = t;
                            rt.restart();
                        }
                    }
                }
            }
        }
    }
    Execution.Engine = Engine;
})(Execution || (Execution = {}));
/// <reference path="Agent.ts" />
/// <reference path="AgentController.ts" />
var Execution;
(function (Execution) {
    "use strict";
    var AgentController = Execution.AgentController;
    var Agent = Execution.Agent;
    class Observer extends Agent {
        constructor() {
            super(AgentController.WORLD, undefined);
            this.parent = this;
        }
        /* tslint:disable no-empty */
        /**
         * Override die to ensure the observer agent cannot be removed
         */
        die() { }
        /**
         * Override Agent setters to ensure the world's default traits don't change
         */
        safeSetColor(color) { }
        safeSetX(x) { }
        safeSetY(y) { }
        safeSetZ(z) { }
        safeSetHeading(x) { }
        safeSetSize(size) { }
        safeSetShape(newShape) { }
        /**
         * Override other mutators to prevent users from modifying world's traits that way
         */
        scatter() { }
        bounce() { }
        bounceDraw(currentX, currentY, deltaX, deltaY, r, g, b) { }
        faceTowards(a) { }
        moveForward(amout) { }
    }
    Execution.Observer = Observer;
})(Execution || (Execution = {}));
/// <reference path="../Compilation/BlocksReader.ts" />
/// <reference path="../Compilation/Compiler.ts" />
/// <reference path="../Compilation/Instructions/Procedure.ts" />
/// <reference path="../Compilation/Instructions/ProcCall.ts" />
/// <reference path="../Common/State.ts" />
/// <reference path="../Common/IWebLogo.ts" />
/// <reference path="../Execution/AgentController.ts" />
/// <reference path="../Execution/Observer.ts" />
/// <reference path="../Execution/Collisions.ts" />
/// <reference path="../DataStructures/BlockPacket.ts" />
/// <reference path="../DataStructures/AST.ts" />
/// <reference path="../Helper/Constants.ts" />
/// <reference path="../Helper/Logger.ts" />
/// <reference path="../Helper/Utils.ts" />
/// <reference path="../dts/scriptblocks.d.ts" />
/// <reference path="../dts/scriptblocks.d.ts" />
var Common;
(function (Common) {
    "use strict";
    var BlocksReader = Compilation.BlocksReader;
    var Compiler = Compilation.Compiler;
    var BlockPacket = DataStructures.BlockPacket;
    var State = Common.State;
    var AgentController = Execution.AgentController;
    var Observer = Execution.Observer;
    var Collisions = Execution.Collisions;
    var Constants = Helper.Constants;
    var Logger = Helper.Logger;
    var Utils = Helper.Utils;
    class WebLogoApp {
        constructor() {
            BlocksReader.app = this;
            AgentController.worldInstance = new Observer();
            for (var breedID of AgentController.getBreedIDs()) {
                var bins = new Array(Math.floor(2 * Constants.MAPSIZE / Collisions.binSize));
                for (var i = 0; i < 2 * Constants.MAPSIZE; i++) {
                    bins[i] = new Array(Math.floor(2 * Constants.MAPSIZE / Collisions.binSize));
                    for (var j = 0; j < 2 * Constants.MAPSIZE; j++) {
                        bins[i][j] = [];
                    }
                }
                Collisions.bins.set(breedID, bins);
            }
            State.generatorSupported = Utils.isGeneratorSupported();
        }
        static parseID(id) {
            for (var i = 5; i < id.length; i++) {
                if (!isNaN(parseInt(id.substring(i), 10))) {
                    return parseInt(id.substring(i), 10);
                }
            }
            if (id === "-1" || id === -1) {
                return -1;
            }
            else {
                throw new Error("Block ID could not be parsed");
            }
        }
        static parseCommand(command) {
            var currEl = "";
            for (var i = 0; i < command.length; i++) {
                if (command.charAt(i) === " " || command.charAt(i) === "\n") {
                    return currEl;
                }
                else {
                    currEl = currEl.concat(command.charAt(i));
                }
            }
            return currEl;
        }
        getConnectedBlockInfo(beforeBlockIDStr, afterBlockIDStr, isArg) {
            return;
        }
        getCreatedBlockInfo(blockName, blockID, blockLabel) {
            return;
        }
        /*
          This is called when something is entered into a text box, but not when a block is inserted in the
          place of an argument.
        */
        getArgumentChangedBlockInfo(blockID, socket, newData) {
            return;
        }
        appGetTopBlocks() {
            var topBlocks = getTopBlocks();
            var genuses = [];
            var ids = [];
            var labels = [];
            for (var block of topBlocks) {
                genuses.push(block[0]);
                ids.push(block[1]);
                labels.push(block[2]);
            }
            var cleanBlocks = [];
            for (var genus of genuses) {
                cleanBlocks.push(Common.WebLogoApp.parseCommand(genus));
            }
            var cleanIDs = [];
            for (var id of ids) {
                cleanIDs.push(Common.WebLogoApp.parseID(id));
            }
            var packets = [];
            for (var i = 0; i < ids.length; i++) {
                packets.push(new BlockPacket(cleanBlocks[i], cleanIDs[i], labels[i]));
            }
            return packets;
        }
        appGetNamedBlocks(name) {
            var namedPackets = getNamedBlocks(name);
            var returnPackets = new Array();
            for (var packet of namedPackets) {
                returnPackets.push(new BlockPacket(packet[0], Common.WebLogoApp.parseID(packet[1]), packet[2]));
            }
            return returnPackets;
        }
        appGetPages() {
            var pageNames = getPages();
            return pageNames;
        }
        appGetCurrentPage() {
            return getCurrentPage();
        }
        appGetParent(blockID) {
            var parentPacket = getParentBlock(blockID);
            if (parentPacket === undefined) {
                return undefined;
            }
            return new BlockPacket(parentPacket[0], Common.WebLogoApp.parseID(parentPacket[1]), parentPacket[2]);
        }
        appGetSBLength(blockID) {
            return getSBLength(blockID);
        }
        appGetPageName(blockID) {
            return getPageName(blockID);
        }
        appGetBlock(blockID) {
            var thisPacket = getBlock(blockID);
            /* tslint:disable no-null-keyword */
            if (thisPacket === undefined || thisPacket === null) {
                /* tslint:enable no-null-keyword */
                return undefined;
            }
            return new BlockPacket(thisPacket[0], Common.WebLogoApp.parseID(thisPacket[1]), thisPacket[2]);
        }
        appGetBlockPage(blockID) {
            // WebLogo.printToJSConsole("Getting block page in WebLogo");
            return getPageName(blockID);
        }
        appGetBeforeBlock(blockID) {
            var beforePacket = getBeforeBlock(blockID);
            /* tslint:disable no-null-keyword */
            if (beforePacket === undefined || beforePacket === null) {
                /* tslint:enable no-null-keyword */
                return undefined;
            }
            return new BlockPacket(beforePacket[0], Common.WebLogoApp.parseID(beforePacket[1]), beforePacket[2]);
        }
        appGetAfterBlock(blockID) {
            var afterPacket = getAfterBlock(blockID);
            /* tslint:disable no-null-keyword */
            if (afterPacket === undefined || afterPacket === null) {
                /* tslint:enable no-null-keyword */
                return undefined;
            }
            return new BlockPacket(afterPacket[0], Common.WebLogoApp.parseID(afterPacket[1]), afterPacket[2]);
        }
        appGetInternalArg(blockID, socketIndex) {
            var arg = getArg(blockID, socketIndex);
            return arg;
        }
        appGetLabel(blockID, socket) {
            var label = getBlockLabel(blockID, socket);
            return label;
        }
        appGetSB(blockID, socket, socketIndex) {
            var subPacket = getSB(blockID, socket, socketIndex);
            /* tslint:disable no-null-keyword */
            if (subPacket === undefined || subPacket === null) {
                /* tslint:enable no-null-keyword */
                return undefined;
            }
            var blocky = new BlockPacket(subPacket[0], Common.WebLogoApp.parseID(subPacket[1]), subPacket[2]);
            return blocky;
        }
        dispatchToJS(args) {
            if (!State.isTest) {
                receiveDispatch(args);
            }
        }
        getBreeds() {
            return AgentController.getBreeds();
        }
        getDeletedBlockInfo(blockIDstr, name) {
            return;
        }
        getDisconnectedBlockInfo(beforeBlockIDStr, afterBlockIDStr, isArg) {
            return;
        }
        getWidgetsOfType(str) {
            // Logger.log(`get widgets of type ${str}`);
            var arr;
            switch (str) {
                case "WebLand.Widgets::ButtonWidget":
                    {
                        arr = WidgetManager.getWidgetsByType(slnova.PushButtonWidget);
                    }
                    break;
                case "WebLand.Widgets::ToggleButtonWidget":
                    {
                        arr = WidgetManager.getWidgetsByType(slnova.ToggleButtonWidget);
                    }
                    break;
                case "WebLand.Widgets::DataBoxWidget":
                    {
                        arr = WidgetManager.getWidgetsByType(slnova.DataBoxWidget);
                    }
                    break;
                case "WebLand.Widgets::LineGraphWidget":
                    {
                        arr = WidgetManager.getWidgetsByType(slnova.ChartWidget);
                    }
                    break;
                case "WebLand.Widgets::TableWidget":
                    {
                        arr = WidgetManager.getWidgetsByType(slnova.TableWidget);
                    }
                    break;
                case "WebLand.Widgets::SliderWidget":
                    {
                        arr = WidgetManager.getWidgetsByType(slnova.SliderWidget);
                    }
                    break;
                case "WebLand.Widgets::LabelWidget":
                    {
                        arr = WidgetManager.getWidgetsByType(slnova.LabelWidget);
                    }
                    break;
                default:
                    {
                        return [];
                    }
                    ;
            }
            var ret = new Array();
            for (var widget of arr) {
                ret.push(widget.getName());
            }
            return ret;
        }
        labelChanged(blockID, name) {
            return;
        }
        getSeriesOfGraph(graphName) {
            return WidgetManager.getSeriesOfGraph(graphName);
        }
        getReadableTraits(breed) {
            return AgentController.getReadableTraits(breed);
        }
        getChangeableTraits(breed) {
            return AgentController.getChangeableTraits(breed);
        }
        getCustomTraits(breed) {
            return AgentController.getCustomTraits(breed);
        }
        getWorldTraits() {
            return AgentController.getCustomTraits(AgentController.WORLD.name);
        }
        addTrait(breedName, trait, dataType, dv) {
            if (Constants.DEFAULT_TRAIT_NAMES.has(trait)) {
                return true;
            }
            var success = AgentController.addTrait(breedName, trait, dataType, dv);
            if (success) {
                BlocksReader.dispatchEvent({
                    "category": "trait",
                    "event": "add",
                    "breed": breedName,
                    "name": trait,
                    "traitType": dataType,
                    "defaultValue": dv,
                });
            }
            return success;
        }
        renameTrait(breedName, oldName, newName, dv) {
            var success = AgentController.renameTrait(breedName, oldName, newName, dv);
            if (success) {
                this.dispatchToJS({
                    "category": "trait",
                    "event": "change",
                    "breed": breedName,
                    "oldName": oldName,
                    "newName": newName,
                });
            }
            return success;
        }
        removeTrait(breedName, trait) {
            var success = AgentController.removeTrait(breedName, trait);
            if (success) {
                this.dispatchToJS({
                    "category": "trait",
                    "event": "delete",
                    "breed": breedName,
                    "name": trait,
                });
            }
            return success;
        }
        addBreed(breedName) {
            var breedID = AgentController.addBreed(breedName);
            if (breedID !== undefined) {
                State.buttonMap[breedID] = new Array();
                State.collisionDict.set(breedID, new Map());
                State.collisionFunctions.set(breedID, new Map());
                var size = Math.floor(2 * Constants.MAPSIZE / Collisions.binSize);
                var bins = new Array(size);
                for (var i = 0; i < size; i++) {
                    bins[i] = new Array(size);
                    for (var j = 0; j < size; j++) {
                        bins[i][j] = [];
                    }
                }
                Collisions.bins.set(breedID, bins);
                this.dispatchToJS({
                    "category": "breed",
                    "event": "add",
                    "defaultShape": "box",
                    "name": breedName,
                });
            }
            return (breedID !== undefined);
        }
        renameBreed(oldName, newName) {
            var success = AgentController.renameBreed(oldName, newName);
            if (success) {
                this.dispatchToJS({
                    "category": "breed",
                    "event": "change",
                    "oldName": oldName,
                    "newName": newName,
                    "name": oldName,
                });
            }
            return success;
        }
        removeBreed(breedName) {
            var breedID = AgentController.removeBreed(breedName);
            if (breedID !== undefined) {
                delete (State.buttonMap[breedID]);
                State.collisionDict.delete(breedID);
                this.dispatchToJS({
                    "category": "breed",
                    "event": "delete",
                    "name": breedName,
                });
            }
            return (breedID !== undefined);
        }
        compileAll() {
            this.reset(false);
            for (var bp of BlocksReader.getTopBlocks()) {
                Compiler.createTopBlock(bp);
            }
            Compiler.compileAll();
        }
        reset(hard) {
            AgentController.reset(hard);
            State.reset(hard);
            State.buttonMap[AgentController.WORLD.id] = [];
            State.buttonMap[AgentController.EVERYONE.id] = [];
            Logger.lastBlockPrint = "";
            Logger.allPrinted = new Array();
            for (var breedID of AgentController.getBreedIDs(true)) {
                State.buttonMap[breedID] = [];
                State.collisionDict.set(breedID, new Map());
                State.collisionFunctions.set(breedID, new Map());
            }
        }
    }
    Common.WebLogoApp = WebLogoApp;
})(Common || (Common = {}));
/// <reference path="../../Helper/Constants.ts" />
/// <reference path="../../DataStructures/AST.ts" />
/// <reference path="../../Common/Agent.ts" />
var Compilation;
(function (Compilation) {
    var Instructions;
    (function (Instructions) {
        "use strict";
        var ASTNode = DataStructures.ASTNode;
        var Constants = Helper.Constants;
        /*
          This class is used exclusively for testing
        */
        class Return extends ASTNode {
            constructor() {
                super(1, 0); // numArgs = 1, numBranches = 0
            }
            fn(a, scope, args, rets) {
                rets[0] = args[0];
                rets[1] = Constants.AST_DONE;
            }
            to_js_no_yield() {
                return `
        return ${this.args.data[0].to_js_no_yield().trim()}
      `;
            }
            to_js_setup() {
                return `
        ${this.args.data[0].to_js_setup()};

        var __wl_${this.id}_ret = ${this.args.data[0].to_js_final().trim()};
      `;
            }
            to_js_final() {
                return `
        return __wl_${this.id}_ret;
      `;
            }
        }
        Instructions.Return = Return;
    })(Instructions = Compilation.Instructions || (Compilation.Instructions = {}));
})(Compilation || (Compilation = {}));
/// <reference path="../Execution/Engine.ts" />
/// <reference path="../Common/App.ts" />
/// <reference path="../Compilation/Instructions/Return.ts" />
