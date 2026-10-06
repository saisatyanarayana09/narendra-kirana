import React from "react";
import renderer from "react-test-renderer";

import { LoadingSpinner } from "./LoadingSpinner";

describe("LoadingSpinner", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("renders correctly as a small spinner by default", () => {
    let tree: any;
    renderer.act(() => {
      tree = renderer.create(<LoadingSpinner />).toJSON();
    });
    expect(tree).toMatchSnapshot();
  });

  it("renders correctly in fullScreen mode", () => {
    let tree: any;
    renderer.act(() => {
      tree = renderer.create(<LoadingSpinner fullScreen />).toJSON();
    });
    expect(tree).toMatchSnapshot();
  });
});
