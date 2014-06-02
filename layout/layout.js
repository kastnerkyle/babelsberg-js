module('users.timfelgentreff.layout.layout').requires().toRun(function() {

    Object.subclass('LayoutObject', {

        isConstraintObject: function() { return true; },

    });

    

    /**

     * Solver

     */

    LayoutObject.subclass("LayoutSolver", {

        initialize: function(algorithm) {

            this.algorithm = algorithm || new LayoutAlgorithmDefault();

            this.algorithm.setSolver(this);

            this.cassowary = new ClSimplexSolver();
            this.cassowary.setAutosolve(false);

            this.reset();

        },

        

        reset: function() {

            this.variables = [];

            this.constraints = [];

            

            this.layoutConstraintVariablesByName = {};

            this.bbbConstraintVariablesByName = {};

        },



        always: function(opts, func)  {

            func.varMapping = opts.ctx;

            var constraint = new Constraint(func, this);

            constraint.enable();

            return constraint;

        },



        constraintVariableFor: function(value, ivarname, bbbConstrainedVariable) {

            if(!value)

                return null;

            if(value && value instanceof lively.morphic.Box) { // Box

                return this.createSpecificVariable(value, ivarname, bbbConstrainedVariable, LayoutConstraintVariableBox);

            }

            if(value && ivarname === "shape") { // Shape

                return this.createSpecificVariable(value, ivarname, bbbConstrainedVariable, LayoutConstraintVariableShape);

            }

            if(value && value instanceof lively.Point && ivarname === "_Extent") { // _Extent

                return this.createSpecificVariable(value, ivarname, bbbConstrainedVariable, LayoutConstraintVariablePoint);

            };

            if(typeof value === "number" && (ivarname === "x" || ivarname === "y")) { // x or y

                return this.createSpecificVariable(value, ivarname, bbbConstrainedVariable, LayoutConstraintVariableNumber);

            }

            return null;

        },

        

        createSpecificVariable: function(value, ivarname, bbbConstrainedVariable, variableClass) {

            var name = ivarname + "" + this.variables.length;

            var v = new (variableClass)(name, value, this, ivarname, bbbConstrainedVariable);

            return v;

        },

        

        addVariable: function(layoutConstraintVariable, bbbConstraintVariable) {

            this.variables.push(layoutConstraintVariable);

            this.bbbConstraintVariablesByName[layoutConstraintVariable.name] = bbbConstraintVariable;

            this.layoutConstraintVariablesByName[layoutConstraintVariable.name] = layoutConstraintVariable;

            

            this.algorithm.addVariable(layoutConstraintVariable);

        },

        

        addConstraint: function(constraint) {

            this.constraints.push(constraint);

            

            this.algorithm.addConstraint(constraint);

        },

        

        removeConstraint: function(constraint) {

            this.constraints.remove(constraint);

            

            this.algorithm.removeConstraint(constraint);

        },

        

        solveOnce: function(constraint) {

            this.addConstraint(constraint);

            try {

                this.solve();

            } finally {

                this.removeConstraint(constraint);

            }

        },

        

        solve: function() {

            this.cassowary.solve();

            

            this.rerender();

        },

        

        rerender: function() {

            //console.log("------- rerender -------");

            this.variables.map(function(constraintVariable) {

                //console.log("rerender", constraintVariable.name, constraintVariable);

                return constraintVariable;

            }).filter(function(constraintVariable) {

                return constraintVariable instanceof LayoutConstraintVariableBox;

            }).each(function(constraintVariable) {

                var morph = constraintVariable.value();

                //console.log("Variable", morph);

                //morph.setExtent(morph.getExtent());

            });

        }

    });




LayoutSolver.addMethods({

    weight: 10000

});

LayoutObject.subclass('LayoutAlgorithm', {

        setSolver: function(solver) {

            this.layoutSolver = solver;

        },

        addVariable: function(variable) {},

        addConstraint: function(constraint) {},

        removeConstraint: function(constraint) {}

    });

    

    LayoutAlgorithm.subclass('LayoutAlgorithmDefault', {

        solve: function() {

            this.layoutSolver.constraints.each(function(constraint) {

                constraint.solve();

            });

        }

    });

    

    LayoutAlgorithm.subclass('LayoutAlgorithmDelegateCassowary', {

    initialize: function() {

        this.solver = new ClSimplexSolver();



        this.variablesByName = {};

        this.constraintsByName = {};

    },

    addVariable: function(variable) {

        if(variable instanceof LayoutConstraintVariableNumber) {

            var cassowaryVariable = this.variablesByName[variable.name] = new ClVariable(variable.name, variable.value());

            this.solver.addConstraint(new ClStayConstraint(cassowaryVariable));

        }

    },

    addConstraint: function(constraint) {

        if(constraint instanceof LayoutConstraintAspectRatio) {

            var width = this.variablesByName[constraint.left.child("shape").child("_Extent").child("x").name];

            var height = this.variablesByName[constraint.left.child("shape").child("_Extent").child("y").name];

            var aspectRatio = constraint.right;

            var cn = width.cnGeq(height.times(aspectRatio));

            this.solver.addConstraint(cn);

        }

    },

    solve: function() {

        Object.keys(this.variablesByName).each(function(name) {

            var numberVariable = this.layoutSolver.layoutConstraintVariablesByName[name];

            var bbbConstraintVariable = this.layoutSolver.bbbConstraintVariablesByName[name];

            var newValue = this.variablesByName[name].value();

            

            numberVariable.setValue(newValue);

            //bbbConstraintVariable.storedValue = newValue;

            //numberVariable.__cvar__.parentConstrainedVariable[numberVariable.ivarname] = newValue;

            console.log("FOOOOOO", bbbConstraintVariable, newValue, numberVariable);

        }, this);

    },

    getCassowary: function() {}

});

    

    /**

     * ConstraintVariable

     */

    LayoutObject.subclass('LayoutConstraintVariable', {

        initialize: function(name, value, solver, ivarname, bbbConstrainedVariable) {

            this.name = name;

            this.setValue(value);

            this.solver = solver;

            this.ivarname = ivarname;

            this.__cvar__ = bbbConstrainedVariable;



            solver.addVariable(this, bbbConstrainedVariable);



            this.__children__ = {};



            this.initChildConstraints();

        },

        value: function() {

            return this.__value__;

        },

        setValue: function(value) {

            this.__value__ = value;

        },

        initChildConstraints: function() {},

        setReadonly: function(bool) {

            // TODO: add some constraint to hold a constant value

            if (bool && !this.readonlyConstraint) {



            } else if (!bool && this.readonlyConstraint) {



            }

        },

        isReadonly: function() {

            return !!this.readonlyConstraint;

        },

        changed: function(bool) {

            if(arguments.length == 0) return this.__changed__;

            this.__changed__ = bool;

            // propagate changed flag upwards

            if(this.parentConstraintVariable && this.parentConstraintVariable instanceof LayoutConstraintVariable) {

                this.parentConstraintVariable.changed(bool)

            }

        },

        child: function(ivarname, child) {

            if(arguments.length < 2)

                return this.__children__[ivarname];

            this.__children__[ivarname] = child;

            child.parentConstraintVariable = this;

        },

        

        // create a ConstrainedVariable for the property given by ivarname

        constrainProperty: function(ivarname) {

            var extentConstrainedVariable = ConstrainedVariable.newConstraintVariableFor(this.value(), ivarname, this.__cvar__);

            if (Constraint.current) {

                extentConstrainedVariable.ensureExternalVariableFor(Constraint.current.solver);

                extentConstrainedVariable.addToConstraint(Constraint.current);

            }

            var childConstraintVariable = extentConstrainedVariable.externalVariables(this.solver);

            this.child(ivarname, childConstraintVariable);

            //console.log("FOOOOOO", ivarname, childConstraintVariable, this, childConstraintVariable.parentConstraintVariable);

            return extentConstrainedVariable;

        }

    });

    LayoutConstraintVariable.subclass('LayoutConstraintVariableBox', {

        initChildConstraints: function() {

            this.shape = this.constrainProperty("shape");

        },

        suggestValue: function(val) {

            //console.log("This is the new Box:", val, this);

            if(this.solver.solving) return val;

    

            this.changed(true);

            this.solver.solve();

        },

        /*

         * accepted functions for Boxes

         */

        sameExtent: function(rightHandSideBox) {

            return new LayoutConstraintBoxSameExtent(this, rightHandSideBox, this.solver);

        },

        getExtent: function() {

            return this

                .child("shape")

                .child("_Extent");

        },

        aspectRatio: function(aspectRatio) {

            return new LayoutConstraintAspectRatio(this, aspectRatio, this.solver);

            // TODO: use correct API

            this.aspectRatio = this.constrainProperty("aspectRatio");

            

            return this.aspectRatio;

        }

    });

    

    LayoutConstraintVariable.subclass('LayoutConstraintVariableShape', {

        initChildConstraints: function() {

            this.extent = this.constrainProperty("_Extent");

        },

        suggestValue: function(val) {

            //console.log("This is the new Shape:", val, this);

    

            if(this.solver.solving) return val;

            this.changed(true);

            this.solver.solve();

        }

        /*

         * accepted functions for Shapes

         */

    });

    

    LayoutConstraintVariable.subclass('LayoutConstraintVariablePoint', {

        initChildConstraints: function() {

            this.x = this.constrainProperty("x");

            this.y = this.constrainProperty("y");

        },

        

        suggestValue: function(val) {
            var x = this.x.externalVariables(this.solver);
            var y = this.y.externalVariables(this.solver);
            x.suggestValue(val.x);
            y.suggestValue(val.y);
        },

        

        /*

         * accepted functions for Points

         */

        eqPt: function(rightHandSidePoint) {

            if(this.ivarname === "_Extent" && rightHandSidePoint.ivarname === "_Extent")

                return this.parentConstraintVariable.parentConstraintVariable.sameExtent(rightHandSidePoint.parentConstraintVariable.parentConstraintVariable);

                

            throw "eqPt does only work for _Extent attributes for now."

        }

    });

    

    LayoutConstraintVariable.subclass('LayoutConstraintVariableNumber', {

        initialize: function ($super, name, value, solver, ivarname, bbbConstrainedVariable) {

            $super(name, value, solver, ivarname, bbbConstrainedVariable);

            

            this.cassowary = new ClVariable(name, value);
            this.stayConstraint = new ClStayConstraint(this.cassowary);

            this.solver.cassowary.addConstraint(this.stayConstraint);

        },

        

        suggestValue: function(value) {

            //console.log("This is the new Number:", value, this);
    
            var c = this.cassowary.cnEquals(value),
                s = this.solver;
                
            s.cassowary.addConstraint(c);
            try {
                s.solve();
            } finally {
                s.cassowary.removeConstraint(c);
            }
        },

        value: function() {

            return this.cassowary.value();

        },

        /*

         * accepted functions for Numbers

         */
        plus: function(value) {
            throw "not yet implemented";
        },
    
        minus: function(value) {
            throw "not yet implemented";
        },
    
        times: function(value) {
            throw "not yet implemented";
        },
    
        divide: function(value) {
            throw "not yet implemented";
        },
    
        cnGeq: function(value) {
            throw "not yet implemented";
        },
    
        cnLeq: function(value) {
            throw "not yet implemented";
        },
    
    
        cnOr: function(value) {
            throw "not yet implemented";
        },
        cnEquals: function(right) {
            return new LayoutConstraintNumberEqual(this, right, this.solver);
        },
        cnIdentical: function(value) {
            throw "not yet implemented";
        }
    });

    

    LayoutConstraintVariable.subclass('LayoutConstraintVariableAspectRatio', {

        suggestValue: function(val) {

            //console.log("This is the new Number:", val, this);

            this.changed(true);

            this.solver.solve();

        },

        /*

         * accepted functions for AspectRatio

         */

        cnGeq: function(rightHandSide) {

            throw "cnEquals not yet implemented."

        }

    });

    // TODO: add further types of constraint variables

    // for Submorphs array (to enable jQuery style of definitions)

    /**

     * Constraint

     */

    LayoutObject.subclass('LayoutConstraint', {

        enable: function (strength) {

            // TODO: consider strength

            this.solver.addConstraint(this);

        },

        disable: function () {

            this.solver.removeConstraint(this);

        }

    });

    LayoutConstraint.subclass('LayoutConstraintBoxSameExtent', {

        initialize: function(left, right, solver) {

            this.left = left.getExtent();
            this.right = right.getExtent();
            this.solver = solver;
            
            this.cnX = new LayoutConstraintNumberEqual(this.left.x.externalVariables(this.solver), this.right.x.externalVariables(this.solver), this.solver);
            this.cnY = new LayoutConstraintNumberEqual(this.left.y.externalVariables(this.solver), this.right.y.externalVariables(this.solver), this.solver);
        }

    });
LayoutConstraint.subclass('LayoutConstraintNumberEqual', {

        initialize: function(left, right, solver) {
            this.left = left;
            this.right = right;
            this.solver = solver;
            
            this.cassowary = this.left.cassowary.cnEquals(this.right.cassowary);
            this.solver.cassowary.addConstraint(this.cassowary);
        }
});
    LayoutConstraint.subclass('LayoutConstraintAspectRatio', {

        initialize: function(box, aspectRatio, solver) {
            this.box = box;
            this.aspectRatio = aspectRatio;
            this.solver = solver;

            var width = this.box.getExtent().x
                .externalVariables(this.solver);
            var height = this.box.getExtent().y
                .externalVariables(this.solver);
            
            this.cassowary = height.cassowary.times(aspectRatio).cnEquals(width.cassowary);
            this.solver.cassowary.addConstraint(this.cassowary);
        }

    });

}) // end of module
