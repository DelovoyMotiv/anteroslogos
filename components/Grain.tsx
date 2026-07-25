import React from 'react';

/**
 * Fixed film-grain overlay. Sits above the background, below content,
 * and adds a subtle tactile texture that keeps large dark areas from
 * reading as flat and cheap.
 */
const Grain: React.FC = () => <div className="grain-overlay" aria-hidden="true" />;

export default Grain;
