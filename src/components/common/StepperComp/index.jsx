import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './index.css';
import {Step, StepLabel, Typography } from '@mui/material';
import Stepper from '@mui/material/Stepper';
import StepIcon from './StepIcon';
const StepperComp = ({
    steps = null,
}) => {
    const [activeStep, setActiveStep] = useState(0);
    const [skipped, setSkipped] = useState(new Set());

    const isStepSkipped = (step) => (skipped.has(step));

    const isStepOptional = (step) => (step === 1);

    const handleNext = () => {
        let newSkipped = skipped;
        if(isStepSkipped(activeStep)) {
            newSkipped = new Set(newSkipped.values());
            newSkipped.delete(activeStep);
        } 
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
        setSkipped(newSkipped);
    };

    const handleBack = () => {
        setActiveStep((prevStep) => (prevStep - 1));
    };

    const handleSkip = () => {
        // if(!isStepOptional(activeStep)) {
        //     throw new Error("you can't skip a step that isn't optional");
        // }

        setActiveStep((prevActiveStep) => prevActiveStep + 1);
        setSkipped((prevSkipped) => {
            const newSkipped = new Set(prevSkipped.values());
            newSkipped.add(activeStep);
            return newSkipped;
        });
    };

    const handleReset = () => setActiveStep(0);
    return (
        <div className="stepperMain">
            <Stepper activeStep={activeStep}>
                {

                    steps.map((step, index) => {
                        const stepProps = {};
                        const labelProps = {};

                        // if(isStepOptional(index)) {
                        //     labelProps.optional = (
                        //         <Typography variant="caption">Optional</Typography>
                        //     );
                        // }

                        if(isStepSkipped(index)) {
                            stepProps.completed = false;
                        }

                        return (
                            <Step classes={{
                            }} key={index} {...stepProps}>
                                <StepLabel StepIconComponent={StepIcon}
                                    {...labelProps}>{step.label}</StepLabel>
                            </Step>
                        );
                    })
                }
            </Stepper>
            {
                activeStep === steps.length ? (
                    <>
                        <Typography sx={{mt: 2, mb: 1}}>
                                    All steps completed - you are finished
                        </Typography>
                        <button onClick={handleReset}>Reset</button>
                    </>
                ) : (
                    <>
                        <Typography sx={{ mt: 2, mb: 1}}>Step {activeStep + 1}</Typography>
                        {
                            steps[activeStep].comp
                        }
                        <button onClick={handleBack}>
                        Back
                        </button>

                        <button onClick={handleNext}>
                            { activeStep === steps.length -1 ? "Finish": "Next"}
                        </button>
                    </>
                )
            }
        </div>
    );
};

StepperComp.propTypes = {
    steps: PropTypes.array,
};

export default StepperComp;