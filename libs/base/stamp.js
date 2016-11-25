module.exports = class Stamp extends require('base/class'){
	//var types = require('types')
	prototype(){
		this.mixin(
			require('base/props'),
			require('base/tools')
		)
		
		this.onFlag0 = 1
		this.onFlag1 = this.redraw

		this.props = {
			x:NaN,
			y:NaN,
			w:NaN,
			h:NaN,
			padding:[0,0,0,0],
			margin:[0,0,0,0],
			align:[0,0],
			down:0,
			cursor:undefined,
			id:'',
			group:''
		}

		this.inheritable('verbs', function(){
			var verbs = this.verbs
			if(!this.hasOwnProperty('_verbs')) this._verbs = this._verbs?Object.create(this._verbs):{}
			for(let key in verbs) this._verbs[key] = verbs[key]
		})

		this.inheritable('states', function(){
			// process stamp states. into shader states
			var states = this.states
			for(let stateName in states){
				var state = states[stateName]
				var stateTime = state.time
				for(let frameName in state){
					var frame = state[frameName]
					if(frameName === 'time' || typeof frame !== 'object') continue // its a playback prop
					var frameTime = frame.time
					
					for(let subName in frame){
						var subFrame = frame[subName]
						
						// ok lets create/modify a subFrame with playback props.
						if(!this.hasOwnProperty(subName)) this[subName] = {}
						var subObj = this[subName]

						if(!subObj.hasOwnProperty('states')) subObj.states = {}
						var subStates = subObj.states

						// lets create the state
						if(!subStates[stateName]) subStates[stateName] = {
							duration:state.duration,
							repeat:state.repeat,
							bounce:state.bounce
						}
						var subState = subStates[stateName]
						if(stateTime) subState.time = stateTime
						
						// alright lets create the keyframe
						var outFrame = subState[frameName] = {}
						if(frameTime) outFrame.time = frameTime
						for(let prop in subFrame){
							outFrame[prop] = subFrame[prop]
						}
					}
				}
			}
		})

		this.verbs = {
			draw: function(overload, click) {
				var stamp = this.ALLOCSTAMP(overload)
				this.STYLESTAMP(stamp, overload)
				stamp.drawStamp()
			}
		}
	}

	setState(state, props){
		this._state = state
		// alright now what. now we need to change state on our range.
		var view = this.view
		var todo = view.todo
		var time = view.app.getTime()
		var $writeList = view.$writeList
		for(let i = this.$writeStart; i < this.$writeEnd; i+=3){
			var mesh = $writeList[i]
			var start = $writeList[i+1]
			var end = $writeList[i+2]
			var proto = mesh.shaderProto
			var info = proto.$compileInfo
			var instanceProps = info.instanceProps
			var interrupt = info.interrupt
			var slots = mesh.slots
			var animState = instanceProps.thisDOTanimState.offset
			var animStart = instanceProps.thisDOTanimStart.offset
			var stateId = info.stateIds[state] || 1
			var final = time + (info.stateDelay[state] || 0)
			var total = final + (info.stateDuration[state] || 0)
			var array = mesh.array
			for(let j = start; j < end; j++){
				var o = j * slots
				interrupt(array, o, time, proto)
				array[o + animState] = stateId // set new state
				array[o + animStart] = final // new start
				if(props) for(let key in props){
					let prop = instanceProps['thisDOT'+key]
					if(!prop) continue
					if(prop.config.pack || prop.slots > 1) throw new Error("Implement propwrite for packed/props with more than 1 slot")
					array[o + prop.offset] = props[key]
				}
				if(total>todo.timeMax) todo.timeMax = total
			}
			// alright so how do we declare this thing dirty
			if(!mesh.dirty){
				mesh.updateMesh()
				mesh.dirty = true
			}
		}
		todo.updateTodoTime()
	}

	// sets a stamp to a new state
	set state(state){
		this.setState(state)
	}

	get state(){
		return this._state
	}

	redraw(){
		var view = this.view
		if(view) view.redraw()
	}

	ALLOCSTAMP(args, indent, className, scope){
		return 'this.view.$allocStamp('+args[0]+', "'+className+'")\n'
	}

	STYLESTAMP(args, indent, className, scope){
		var code = ''
		var props = this._props
		code += indent + 'var $v;if(($v=' + args[1] + '.state) !== undefined) '+args[0]+'._state = $v;\n'
		for(let key in props){
			code += indent + 'var $v;if(($v=' + args[1] + '.' + key + ') !== undefined) '+args[0]+'._'+key+' = $v;\n'
		}
		return code
	}

	drawStamp(){
		var view = this.view
		var $writeList = view.$writeList
		this.$writeStart = $writeList.length
		var turtle = this.turtle
		turtle._margin = this._margin
		turtle._padding = this._padding
		turtle._align = this._align
		turtle._down = this._down
		turtle._wrap = this._wrap
		turtle._x = this._x
		turtle._y = this._y
		turtle._w = this._w
		turtle._h = this._h
		this.beginTurtle()
		this.turtle._pickId = this.$pickId
		this.onDraw()
		var ot = this.endTurtle()
		turtle.walk(ot)
		this.$writeEnd = $writeList.length
	}

	onCompileVerbs(){
		this.__initproto__()
	}
}