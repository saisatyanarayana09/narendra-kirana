import React from 'react';
import renderer from 'react-test-renderer';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  it('renders correctly as a small spinner by default', () => {
    const tree = renderer.create(<LoadingSpinner />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders correctly in fullScreen mode', () => {
    const tree = renderer.create(<LoadingSpinner fullScreen={true} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
