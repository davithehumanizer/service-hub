 
import React from 'react'

import Wizard from '../components/Wizard/Wizard';
import Summary from '../components/Wizard/Steps/Summary';
import { RootState } from '../stores/globalStore';
import { useSelector } from 'react-redux';


const Dashboard = () => {
  const state = useSelector((state: RootState) => state.repairWorkflow.state);
  return (
    <>
      {state === "completed" ?
        <Summary />
      :<Wizard/> }
    </>
  );
}; 

export default Dashboard;
