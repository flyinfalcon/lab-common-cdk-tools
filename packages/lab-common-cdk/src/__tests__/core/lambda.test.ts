/* eslint-disable @typescript-eslint/no-unused-vars,max-classes-per-file */
import '@aws-cdk/assert/jest';
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as logs from '@aws-cdk/aws-logs';
import { lab, labutil } from '../..';

/**
 * Basic Test stack
 */
class TestStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        labutil.tag(this);

        const lamb = lab.lambda.Function(this, 'test-func');
    }
}

/**
 * More Adanced test stack
 */
class AdvancedTestStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        labutil.tag(this);

        const lamb = lab.lambda.Function(this, 'test-func', {
            handler: 'index.specialFunc',
            memorySize: 256,
            code: lambda.Code.fromAsset('src/__tests__/fixtures/test-func'),
            runtime: lambda.Runtime.NODEJS_14_X,
            logRetention: logs.RetentionDays.ONE_YEAR,
        }, { useStage : false });
    }
}

/**
 * Customised Test stack
 */
class CustomTestStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        labutil.tag(this);

        const lamb = lab.lambda.Function(this, 'src');
    }
}

describe('Tests lambda core functionality', () => {

    // Given
    const app = new cdk.App({
        context: { stage: 'basicstack', assetPath: './src/__tests__/fixtures' },
    });

    test('Tests basic lambda stack', () => {

        // When
        const stack = new TestStack(app, 'MyTestStack');

        // Then
        expect(labutil.getStage(app)).toBe('basicstack');
        expect(stack).toHaveResourceLike('AWS::Lambda::Function', {
            FunctionName: 'test-func-basicstack',
            Handler: 'index.handler',
            MemorySize: 128,
            Runtime: 'nodejs12.x',
            Tags: [
                {
                    Key: 'lab_project',
                    Value: 'dvla-emerging-tech'
                }
            ]
        }
        );
    });

    test('Tests asset path lambda stack', () => {

        // Given
        const anotherApp = new cdk.App({
            context: { stage: 'mystack' },
        });

        // When
        const stack = new CustomTestStack(anotherApp, 'MyAssetTestStack');

        // Then
        expect(stack).toHaveResourceLike('AWS::Lambda::Function', {
            FunctionName: 'src-mystack',
        });
    });

    test('Tests advanced lambda stack', () => {

        // When
        const stack = new AdvancedTestStack(app, 'MyAdvancedTestStack');

        // Then
        expect(stack).toHaveResourceLike('AWS::Lambda::Function', {
            FunctionName: 'test-func',
            Handler: 'index.specialFunc',
            MemorySize: 256,
            Runtime: 'nodejs14.x',
        });

        expect(stack).toHaveResourceLike('Custom::LogRetention', {
            RetentionInDays: 365
        });
    });
});
