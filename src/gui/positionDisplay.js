export const createPositionDisplay = () => {
  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'fixed',
    top: '10px',
    left: '10px',
    background: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: '10px',
    borderRadius: '5px',
    fontFamily: 'monospace',
    zIndex: 1000
  });

  const updatePosition = (position) => {
    const gridX = Math.floor(position.x);
    const gridZ = Math.floor(position.z);
    container.textContent = `Position: (${gridX}, ${gridZ})`;
  };

  return {
    element: container,
    updatePosition
  };
}; 