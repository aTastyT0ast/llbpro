import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { LLBProStack } from '../src/main';

test.skip('Snapshot', () => {
  const app = new App();
  const stack = new LLBProStack(app, 'test');

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});