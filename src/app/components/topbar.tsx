import React from 'react';
import styles from '../styles/topbar.module.css';

interface TopBarProps {
  setActiveComponent: (component: 'consult' | 'upload') => void;
}

const TopBar: React.FC<TopBarProps> = ({ setActiveComponent }) => {
  return (
    <div className={styles.topbar}>
      <div className={styles.buttonContainer}>
        <button className={styles.button} onClick={() => setActiveComponent('consult')}>
          Consultar Facturas
        </button>
        <button className={styles.button} onClick={() => setActiveComponent('upload')}>
          Cargar una nueva factura
        </button>
      </div>
    </div>
  );
};

export default TopBar;