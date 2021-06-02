import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';
import * as logs from '@aws-cdk/aws-logs';
import { Logs } from 'cdk-iam-floyd';
import * as Path from 'path';
import * as nodejs from '@aws-cdk/aws-lambda-nodejs';
import { MergeAware, StageAware } from './defaults';
import { getStageAwareName, mergeProperties } from '../utils';

export const LAMBDA_DEFAULTS = {
    runtime: lambda.Runtime.NODEJS_12_X,
    handler: 'index.handler',
    memorySize: 128,
    timeout: cdk.Duration.seconds(60),
    tracing: lambda.Tracing.ACTIVE,
    logRetention: logs.RetentionDays.ONE_WEEK,
} as Partial<lambda.FunctionProps>;

export const LAMBDA_NODEJS_DEFAULTS = {
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: 'handler',
    memorySize: 128,
    timeout: cdk.Duration.seconds(60),
    tracing: lambda.Tracing.ACTIVE,
    logRetention: logs.RetentionDays.ONE_WEEK,
    bundling: {
        externalModules: [
            'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
        ],
    }
} as Partial<nodejs.NodejsFunctionProps>;

/**
 * Get the root path where the lambdas are stored.
 * @param scope
 */
const getAssetPath = (scope: cdk.IConstruct) => {
    const path = process.env.CDK_ASSET_PATH || scope.node.tryGetContext('assetPath') as string || '';
    return Path.normalize(path)
};

/**
 * Add permissions to the Lambda for: Logging
 * @param aLambda any Lambda
 * @param path usually the function name
 */
const addDefaultPermissions = (aLambda: lambda.Function, path: string) => {
    aLambda.role?.addToPrincipalPolicy(new Logs()
        .toCreateLogGroup()
        .toCreateLogStream()
        .toPutLogEvents()
        .onLogGroup(
            `/aws/lambda/${path}:*`, cdk.Aws.ACCOUNT_ID, cdk.Aws.REGION, cdk.Aws.PARTITION,
        ));
};

/**
 * Additional parameters used by the Lambda function creation utility.
 */
export interface FunctionParams extends StageAware, MergeAware {

}

/**
 * Creates a standard Lambda function, using sensible defaults where possible.
 * The optional custom FunctionProps will override the default parameters.
 * By default, the path to your assets can be specified globally via `process.env.CDK_ASSET_PATH` or via
 * the 'assetPath' context variable.  Alternatively, specify your own assets with the `code` FunctionProp.
 *
 * @param scope - the stack
 * @param id - a meaningful name
 * @param props - Optional custom FunctionProps to use with the lambda.
 * @param params - Optional additional parameters specific to this function.
 * @constructor
 */
export const Function = (scope: cdk.Construct, id: string, props?: Partial<lambda.FunctionProps>,
    params?: Partial<FunctionParams>): lambda.Function => {

    const fullFunctionName = getStageAwareName(scope, id, params);
    const coreAssets = props?.code ?? lambda.Code.fromAsset(`${getAssetPath(scope)}/${id}`);
    const funcProps = {
        functionName: fullFunctionName,
        code: coreAssets,
    };
    const defaultProps = mergeProperties(LAMBDA_DEFAULTS, funcProps);

    // Create a Node Lambda with conventions
    const createdLambda = new lambda.Function(scope, fullFunctionName, mergeProperties(defaultProps, props));
    addDefaultPermissions(createdLambda, fullFunctionName);
    return createdLambda;
};

/**
 * Creates a standard NODE JS Lambda function, using sensible defaults where possible.
 * The optional custom FunctionProps will override the default parameters.
 * Automatically uses ESbuild to bundle your lambda.
 * By default, the root path to your code entry can be specified globally via `process.env.CDK_ASSET_PATH` or via
 * the 'assetPath' context variable.  Alternatively, specify your own core path with the `entry` FunctionProp.
 * @param scope - the stack
 * @param id - a meaningful name
 * @param props - Optional custom FunctionProps to use with the lambda.
 * @param params - Optional additional parameters specific to this function.
 * @constructor
 */
export const NodejsFunction = (scope: cdk.Construct, id: string, props?: Partial<nodejs.NodejsFunctionProps>,
    params?: Partial<FunctionParams>): nodejs.NodejsFunction => {

    const fullFunctionName = getStageAwareName(scope, id, params);
    let defaultProps = LAMBDA_NODEJS_DEFAULTS;
    if (!props?.entry) {
        const coreEntry = `${getAssetPath(scope)}/functions/${id}/${id}.js`;
        const funcProps = {
            entry: coreEntry
        };
        defaultProps = mergeProperties(LAMBDA_NODEJS_DEFAULTS, funcProps);
    }

    // Create a Node JS Lambda with conventions
    const createdLambda = new nodejs.NodejsFunction(scope, fullFunctionName, mergeProperties(defaultProps, props));
    addDefaultPermissions(createdLambda, fullFunctionName);
    return createdLambda;
};
